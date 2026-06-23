// Sharing: a per-animal link plus an exported "share card" image
// (solved artwork + names) rendered on a canvas.

import { imageUrl } from '../data/animals.js'

const SHARE_BASE = 'https://ash-codess.github.io/art-of-fauna/a/'

export function shareLink(slug) {
  return `${SHARE_BASE}${slug}`
}

// Rounded-rect path helper (older canvas impls lack roundRect).
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // needed to export an untainted canvas
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Render a 1080×1350 portrait share card to a Blob.
 * Returns null if the image can't be drawn (e.g. CORS-tainted canvas).
 */
export async function buildShareCard(animal) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Herbarium sage ground
  ctx.fillStyle = '#E3E8DF'
  ctx.fillRect(0, 0, W, H)

  const pad = 72
  const frameX = pad
  const frameY = pad
  const frameW = W - pad * 2
  const frameH = 900

  // Artwork card
  try {
    const img = await loadImage(imageUrl(animal.file, 1100))
    ctx.save()
    roundRect(ctx, frameX, frameY, frameW, frameH, 28)
    ctx.clip()
    // cover-fit
    const scale = Math.max(frameW / img.width, frameH / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.drawImage(img, frameX + (frameW - dw) / 2, frameY + (frameH - dh) / 2, dw, dh)
    ctx.restore()
  } catch {
    return null
  }

  // Card border
  ctx.strokeStyle = 'rgba(38,48,42,0.16)'
  ctx.lineWidth = 2
  roundRect(ctx, frameX, frameY, frameW, frameH, 28)
  ctx.stroke()

  // Latin name (italic serif, small)
  const textY = frameY + frameH + 86
  ctx.fillStyle = 'rgba(38,48,42,0.6)'
  ctx.font = 'italic 34px Lora, Georgia, serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(animal.latin, pad, textY)

  // Common name (large serif)
  ctx.fillStyle = '#26302A'
  ctx.font = '600 76px Lora, Georgia, serif'
  ctx.fillText(animal.common, pad, textY + 78)

  // Footer mark
  ctx.fillStyle = '#3F6B4C'
  ctx.font = '600 26px Inter, Arial, sans-serif'
  ctx.fillText('ART OF FAUNA', pad, H - 56)

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/**
 * Share a solved animal. Prefers the native share sheet with the card image;
 * otherwise downloads the card and copies the link. Returns a status string.
 */
export async function shareAnimal(animal) {
  const link = shareLink(animal.slug)
  let blob = null
  try {
    blob = await buildShareCard(animal)
  } catch {
    blob = null
  }

  const file = blob
    ? new File([blob], `art-of-fauna-${animal.slug}.png`, { type: 'image/png' })
    : null

  // Native share with image (mobile + some desktop)
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Art of Fauna — ${animal.common}`,
        text: `${animal.common} (${animal.latin})`,
        url: link,
      })
      return 'shared'
    } catch {
      /* user cancelled or unsupported — fall through */
    }
  }

  // Fallback: download the card if we have one
  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `art-of-fauna-${animal.slug}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  // Always try to put the link on the clipboard
  try {
    await navigator.clipboard.writeText(link)
    return blob ? 'downloaded+copied' : 'copied'
  } catch {
    return blob ? 'downloaded' : 'failed'
  }
}
