#!/usr/bin/env bash

docker run -d --name my-stk-server \
  --restart unless-stopped \
  -p 2757:2757/udp \
  -p 2759:2759/udp \
  -e SERVER_NAME="NI SuperTuxKart Server" \
  -e MAX_PLAYERS=20 \
  -e SERVER_MODE=3 \
  peucastro/stk-server:latest
