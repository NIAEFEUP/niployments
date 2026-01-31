#!/bin/bash

# Health check for VRRP - verifies internet connectivity
# Requires majority (2/3) of services to respond

TIMEOUT=5
SUCCESS_COUNT=0
REQUIRED=2

# Check Cloudflare (HTTPS)
curl -s --connect-timeout $TIMEOUT https://1.1.1.1 > /dev/null 2>&1 && ((SUCCESS_COUNT++))

# Check Google (HTTPS)
curl -s --connect-timeout $TIMEOUT https://8.8.8.8 > /dev/null 2>&1 && ((SUCCESS_COUNT++))

# Check Quad9 (HTTPS)
curl -s --connect-timeout $TIMEOUT https://9.9.9.9 > /dev/null 2>&1 && ((SUCCESS_COUNT++))

# Exit 0 (success) if majority responded, 1 (failure) otherwise
if [ $SUCCESS_COUNT -ge $REQUIRED ]; then
    exit 0
else
    exit 1
fi
