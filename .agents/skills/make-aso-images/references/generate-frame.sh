#!/bin/bash
set -euo pipefail

# Usage:
#   bash generate-frame.sh <screenshot-path> <headline> <bg-color> <text-color> <width> <height> <output-path>

SCREENSHOT_PATH="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
HEADLINE="${2:?Usage: $0 <screenshot> <headline> <bg-color> <text-color> <width> <height> <output>}"
BG_COLOR="${3:-#1A73E8}"
TEXT_COLOR="${4:-#FFFFFF}"
FRAME_WIDTH="${5:-1290}"
FRAME_HEIGHT="${6:-2796}"
OUTPUT_PATH="${7:?Output path required}"

FONT_SIZE=$((FRAME_WIDTH / 18))
TOP_PADDING=$((FRAME_HEIGHT / 25))
GAP=$((FRAME_HEIGHT / 120))
SCREENSHOT_WIDTH=$((FRAME_WIDTH * 85 / 100))
BORDER_RADIUS=$((FRAME_WIDTH / 40))
SHADOW_Y=$((FRAME_WIDTH / 100))
SHADOW_BLUR=$((FRAME_WIDTH / 30))

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/frame-template.html"

TEMP_DIR="$(mktemp -d)"
FRAME_HTML="$TEMP_DIR/frame.html"

sed \
  -e "s|{{BG_COLOR}}|${BG_COLOR}|g" \
  -e "s|{{TEXT_COLOR}}|${TEXT_COLOR}|g" \
  -e "s|{{HEADLINE}}|${HEADLINE}|g" \
  -e "s|{{SCREENSHOT_PATH}}|file://${SCREENSHOT_PATH}|g" \
  -e "s|{{FRAME_WIDTH}}|${FRAME_WIDTH}|g" \
  -e "s|{{FRAME_HEIGHT}}|${FRAME_HEIGHT}|g" \
  -e "s|{{FONT_SIZE}}|${FONT_SIZE}|g" \
  -e "s|{{TOP_PADDING}}|${TOP_PADDING}|g" \
  -e "s|{{GAP}}|${GAP}|g" \
  -e "s|{{SCREENSHOT_WIDTH}}|${SCREENSHOT_WIDTH}|g" \
  -e "s|{{BORDER_RADIUS}}|${BORDER_RADIUS}|g" \
  -e "s|{{SHADOW_Y}}|${SHADOW_Y}|g" \
  -e "s|{{SHADOW_BLUR}}|${SHADOW_BLUR}|g" \
  "$TEMPLATE" > "$FRAME_HTML"

mkdir -p "$(dirname "$OUTPUT_PATH")"

# NOTE: `--viewport WxH` is NOT a real agent-browser flag — it is silently ignored.
# Viewport must be set with `set viewport <w> <h>` BEFORE opening the page.
agent-browser set viewport "${FRAME_WIDTH}" "${FRAME_HEIGHT}"
agent-browser --allow-file-access open "file://${FRAME_HTML}"

agent-browser wait 1500
agent-browser screenshot "$OUTPUT_PATH"
agent-browser close

if [ ! -f "$OUTPUT_PATH" ]; then
  echo "FAILED: $OUTPUT_PATH not created"
  exit 1
fi

ACTUAL_W=$(sips -g pixelWidth "$OUTPUT_PATH" 2>/dev/null | awk '/pixelWidth/{print $2}')
ACTUAL_H=$(sips -g pixelHeight "$OUTPUT_PATH" 2>/dev/null | awk '/pixelHeight/{print $2}')
if [ "$ACTUAL_W" != "$FRAME_WIDTH" ] || [ "$ACTUAL_H" != "$FRAME_HEIGHT" ]; then
  echo "FAILED: $OUTPUT_PATH is ${ACTUAL_W}x${ACTUAL_H}, expected ${FRAME_WIDTH}x${FRAME_HEIGHT}"
  exit 1
fi

rm -rf "$TEMP_DIR"
