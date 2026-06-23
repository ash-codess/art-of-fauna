# Fetches one verified vintage illustration per species from Wikimedia Commons.
# Emits src/data/images.json  ->  { slug: { file, width, height, descUrl } }

$species = @(
  @{ slug="bald-eagle";        q="Bald Eagle Audubon birds of america plate" }
  @{ slug="snowy-owl";         q="Snowy Owl Audubon plate" }
  @{ slug="american-flamingo"; q="American Flamingo Audubon plate" }
  @{ slug="carolina-parakeet"; q="Carolina Parakeet Audubon plate" }
  @{ slug="atlantic-puffin";   q="Atlantic Puffin Audubon plate" }
  @{ slug="northern-cardinal"; q="Cardinal grosbeak Audubon plate" }
  @{ slug="great-blue-heron";  q="Great Blue Heron Audubon plate" }
  @{ slug="wild-turkey";       q="Wild Turkey Audubon birds of america plate" }
  @{ slug="ruby-hummingbird";  q="Ruby-throated Hummingbird Audubon plate" }
  @{ slug="whooping-crane";    q="Whooping Crane Audubon plate" }
  @{ slug="passenger-pigeon";  q="Passenger Pigeon Audubon plate" }
  @{ slug="indian-peafowl";    q="Indian Peafowl peacock lithograph plate" }
  @{ slug="barn-owl";          q="Barn Owl Audubon plate" }
  @{ slug="mandarin-duck";     q="Mandarin Duck Aix galericulata lithograph plate" }
  @{ slug="common-kingfisher"; q="Common Kingfisher Alcedo atthis lithograph plate" }
  @{ slug="toco-toucan";       q="Toco Toucan Ramphastos lithograph plate" }
  @{ slug="scarlet-macaw";     q="Scarlet Macaw Ara macao lithograph plate" }
  @{ slug="bird-of-paradise";  q="Greater Bird of paradise Paradisaea lithograph plate" }
  @{ slug="red-fox";           q="Red Fox Vulpes vulpes Iconographia Zoologica plate" }
  @{ slug="gray-wolf";         q="Wolf Canis lupus Iconographia Zoologica lithograph plate" }
  @{ slug="tiger";             q="Tiger Panthera tigris lithograph plate antique" }
  @{ slug="lion";              q="Lion Panthera leo lithograph plate antique" }
  @{ slug="asian-elephant";    q="Asian Elephant Elephas maximus lithograph plate antique" }
  @{ slug="giraffe";           q="Giraffe camelopardalis lithograph plate antique" }
  @{ slug="plains-zebra";      q="Zebra Equus lithograph plate antique" }
  @{ slug="polar-bear";        q="Polar Bear Ursus maritimus lithograph plate antique" }
  @{ slug="green-sea-turtle";  q="Green Sea Turtle Chelonia mydas lithograph plate antique" }
  @{ slug="common-octopus";    q="Octopus vulgaris lithograph plate antique" }
  @{ slug="compass-jellyfish"; q="Haeckel Discomedusae jellyfish Kunstformen" }
  @{ slug="seahorse";          q="Seahorse Hippocampus lithograph plate antique" }
  @{ slug="monarch-butterfly"; q="Monarch Butterfly Danaus plexippus lithograph plate antique" }
  @{ slug="european-robin";    q="European Robin Erithacus rubecula lithograph plate antique" }
)

$UA = "ArtOfFauna/1.0 (https://artoffauna.app; build script; contact astha.ghosh2@cognizant.com)"
function Invoke-CommonsSearch($query) {
  $s = [uri]::EscapeDataString($query + " filetype:bitmap")
  $api = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=$s&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime|size&format=json"
  for ($try = 1; $try -le 4; $try++) {
    $raw = & curl.exe -s -A $UA $api
    try { return ($raw | ConvertFrom-Json) }
    catch { Start-Sleep -Milliseconds (400 * $try) }
  }
  return $null
}

$result = [ordered]@{}
foreach ($sp in $species) {
  $j = Invoke-CommonsSearch $sp.q
  $pick = $null
  if ($j -and $j.query) {
    $cands = $j.query.pages.PSObject.Properties.Value | ForEach-Object {
      $ii = $_.imageinfo[0]
      if ($ii -and $ii.mime -eq "image/jpeg" -and $ii.width -ge 500 -and $ii.height -ge 500) {
        [pscustomobject]@{ title=$_.title; w=$ii.width; h=$ii.height; desc=$ii.descriptionurl }
      }
    }
    # prefer images that are not absurdly tall (portrait plates ok but avoid >2.2 aspect)
    $pick = $cands | Sort-Object @{e={[math]::Abs(($_.h/$_.w) - 1.25)}} | Select-Object -First 1
  }
  if ($pick) {
    $file = ($pick.title -replace "^File:","")
    $result[$sp.slug] = [ordered]@{ file=$file; width=$pick.w; height=$pick.h; descUrl=$pick.desc }
    Write-Output ("OK  {0,-20} {1,5}x{2,-5} {3}" -f $sp.slug,$pick.w,$pick.h,$file)
  } else {
    $result[$sp.slug] = $null
    Write-Output ("MISS {0}" -f $sp.slug)
  }
  Start-Sleep -Milliseconds 600
}

$out = Join-Path $PSScriptRoot "..\src\data\images.json"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
$result | ConvertTo-Json -Depth 6 | Out-File -FilePath $out -Encoding utf8
Write-Output "`nWrote $out"
