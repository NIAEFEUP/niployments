#!/bin/bash
    # Note: use su -c to check if that commmand works under the
    #       keepalived_script user.
    # simple way of checking haproxy process:
    # script "/usr/bin/killall -0 haproxy"
    # the more intelligent way of checking the haproxy process
    /usr/bin/systemctl is-active --quiet haproxy




