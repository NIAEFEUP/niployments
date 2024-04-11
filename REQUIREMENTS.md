# Cluster node requirements

As per [Rancher's Installation Requirements](https://ranchermanager.docs.rancher.com/pages-for-subheaders/installation-requirements#operating-systems-and-container-runtime-requirements), all nodes need to have the `ntp` package installed and `firewalld` needs to be disabled and not running (it might be possible to have `firewalld` running as long as we configure it correctly). Since we'll be using `RKE2`, there is no need for `docker` or `containerd` to be installed.

## Port requirements

https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/port-requirements