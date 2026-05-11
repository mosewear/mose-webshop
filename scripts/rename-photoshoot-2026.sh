#!/usr/bin/env bash
# Photoshoot 2026 v2 — rename + copy.
# Wipes old top-level *.jpg in photoshoot-2026/ then copies the 54 new
# DSC*.jpg from "Shoot compleet zonder korrel/" with semantic names per
# scripts/photoshoot-2026-source-mapping.json.
#
# Source files in "Shoot compleet zonder korrel/" stay untouched (we
# only copy, not move) so the originals remain available for re-runs.
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="photoshoot-2026/Shoot compleet zonder korrel"
DST="photoshoot-2026"

if [[ ! -d "$SRC" ]]; then
  echo "✗ source not found: $SRC" >&2
  exit 1
fi

echo "Wiping old top-level *.jpg in $DST …"
find "$DST" -maxdepth 1 -type f -name '*.jpg' -delete

declare -a MAP=(
  "DSC01780.jpg|lifestyle_hoodies_black-olive_graffiti-walk-grass_portrait.jpg"
  "DSC01892.jpg|crop_hoodies_trio-brown-black-olive_graffiti-chest-logos_landscape.jpg"
  "DSC01910.jpg|group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg"
  "DSC01929.jpg|hero_hoodie_olive-front-trio_graffiti-formation_portrait.jpg"
  "DSC02013.jpg|lifestyle_tee_sand_canal-street-smile_portrait.jpg"
  "DSC02017.jpg|detail_tee_sand_chest-logo_landscape.jpg"
  "DSC02248.jpg|lifestyle_tee_white_canal-sleeve-roll_portrait.jpg"
  "DSC02254.jpg|detail_tee_white_chest-logo-arms_landscape.jpg"
  "DSC02256.jpg|detail_tee_white_chest-puff-logo_portrait.jpg"
  "DSC02263.jpg|editorial_tee_white_canal-back-blossoms_portrait.jpg"
  "DSC02269.jpg|hero_tee_black_canal-blossoms-look-down_portrait.jpg"
  "DSC02274.jpg|hero_tee_black_canal-blossoms-look-side_portrait.jpg"
  "DSC02293.jpg|lifestyle_tees_sand-back-black-front_canal-blossoms_portrait.jpg"
  "DSC02300.jpg|lifestyle_tees_sand-front-black-back_canal_landscape.jpg"
  "DSC02327.jpg|hero_tee_olive_canal-pose_portrait.jpg"
  "DSC02355.jpg|lifestyle_tee_olive_canal-back-walk_portrait.jpg"
  "DSC02446.jpg|lifestyle_sweater_cream_facade-arch-smile_portrait.jpg"
  "DSC02468.jpg|hero_sweater_cream_facade-smile_portrait.jpg"
  "DSC02498.jpg|group_sweater_quartet-white-black_facade-arches_landscape.jpg"
  "DSC02506.jpg|group_sweater_quartet-white-black_facade-poised_landscape.jpg"
  "DSC02509.jpg|detail_sweater_cream-mid-black-sides_facade-arms-shoulder_landscape.jpg"
  "DSC02512.jpg|detail_sweater_black_chest-logo-hand_portrait.jpg"
  "DSC02540.jpg|detail_sweater_cream_chest-puff-roll_landscape.jpg"
  "DSC02553.jpg|lifestyle_sweater_cream_facade-arch-lean_portrait.jpg"
  "DSC02556.jpg|detail_sweater_cream_chest-puff-logo_portrait.jpg"
  "DSC02639.jpg|couple_sweater-cream-hoodie-black_steps-walk_portrait.jpg"
  "DSC02666.jpg|couple_sweater-cream-hoodie-black_steps-lean_portrait.jpg"
  "DSC02708.jpg|couple_sweater-cream-hoodie-black_steps-hug-laugh_portrait.jpg"
  "DSC06483.jpg|hero_hoodie_black_brick-graffiti-drape_portrait.jpg"
  "DSC06490.jpg|hero_hoodie_black_brick-graffiti-smile_portrait.jpg"
  "DSC06511.jpg|hero_hoodie_olive_graffiti-laugh_portrait.jpg"
  "DSC06513.jpg|detail_hoodie_olive_chest-puff-logo_portrait.jpg"
  "DSC06515.jpg|lifestyle_hoodie_olive_graffiti-lean-smile_portrait.jpg"
  "DSC06517.jpg|detail_hoodie_olive_chest-puff-close_portrait.jpg"
  "DSC06540.jpg|lifestyle_hoodie_olive_graffiti-sleeve-look_portrait.jpg"
  "DSC06549.jpg|hero_hoodie_olive_graffiti-arms-cross_portrait.jpg"
  "DSC06599.jpg|hero_hoodie_brown_graffiti-pink-hood-pull_portrait.jpg"
  "DSC06601.jpg|lifestyle_hoodie_brown_graffiti-pink-hood-look_portrait.jpg"
  "DSC06631.jpg|lifestyle_hoodies_brown-olive_graffiti-pink-walk_portrait.jpg"
  "DSC06637.jpg|hero_hoodie_brown_graffiti-smile_portrait.jpg"
  "DSC06683.jpg|group_hoodies_black-olive_graffiti-laughing-arm-rest_portrait.jpg"
  "DSC06686.jpg|group_hoodies_trio-brown-black-olive_graffiti-smile-line_portrait.jpg"
  "DSC06752.jpg|hero_hoodie_brown_graffiti-pole_portrait.jpg"
  "DSC06761.jpg|detail_hoodie_brown_drape-pose_portrait.jpg"
  "DSC06788.jpg|lifestyle_hoodies_brown-olive_graffiti-mmx-smile_landscape.jpg"
  "DSC06795.jpg|hero_hoodie_black_concrete-look-side_portrait.jpg"
  "DSC06799.jpg|lifestyle_hoodie_black_concrete-arm-up_portrait.jpg"
  "DSC06807.jpg|detail_hoodie_black_back-view_portrait.jpg"
  "DSC06823.jpg|hero_hoodie_brown_concrete-hood-up_portrait.jpg"
  "DSC06826.jpg|lifestyle_hoodie_brown_concrete-side-profile_portrait.jpg"
  "DSC06832.jpg|detail_hoodie_brown_back-view_portrait.jpg"
  "DSC06834.jpg|hero_hoodie_olive_concrete-front_portrait.jpg"
  "DSC06840.jpg|lifestyle_hoodie_olive_concrete-hand-wall_portrait.jpg"
  "DSC06846.jpg|detail_hoodie_olive_back-view_portrait.jpg"
)

count=0
for entry in "${MAP[@]}"; do
  src_name="${entry%%|*}"
  dst_name="${entry##*|}"
  src_path="$SRC/$src_name"
  dst_path="$DST/$dst_name"
  if [[ ! -f "$src_path" ]]; then
    echo "✗ missing source: $src_path" >&2
    exit 1
  fi
  cp "$src_path" "$dst_path"
  count=$((count + 1))
done

echo "✓ copied $count files into $DST/"
echo
echo "Top-level *.jpg in $DST/:"
ls "$DST"/*.jpg | wc -l
