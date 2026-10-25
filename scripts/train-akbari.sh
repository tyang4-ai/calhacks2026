#!/bin/sh
# The Akbari GPU training path (B11-embed): runs server/b11_embed/train_akbari.sh from wherever this checkout is.
exec bash "$(dirname "$0")/../server/b11_embed/train_akbari.sh" "$@"
