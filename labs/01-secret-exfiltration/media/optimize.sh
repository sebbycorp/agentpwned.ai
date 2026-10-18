#!/usr/bin/env bash
# Shrink the vhs GIFs and add a WebM plus a poster for each clip.
# Run from anywhere. Reads media/*.mp4 written by the tapes.

set -o errexit -o nounset -o pipefail

here="$(cd "$(dirname "$0")" && pwd)"
need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}
need ffmpeg

shopt -s nullglob
for mp4 in "${here}"/*.mp4; do
  name="$(basename "${mp4}" .mp4)"
  gif="${here}/${name}.gif"
  webm="${here}/${name}.webm"
  poster="${here}/${name}.png"
  if [[ -f "${gif}" ]]; then
    tmp="${here}/${name}.opt.gif"
    ffmpeg -y -loglevel error -i "${gif}" \
      -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
      "${tmp}"
    mv "${tmp}" "${gif}"
  fi
  ffmpeg -y -loglevel error -i "${mp4}" -an -c:v libvpx-vp9 -crf 36 -b:v 0 -deadline good -cpu-used 2 "${webm}"
  ffmpeg -y -loglevel error -sseof -0.5 -i "${mp4}" -frames:v 1 -vf "scale=960:-1" "${poster}"
  echo "optimized ${name}"
done
