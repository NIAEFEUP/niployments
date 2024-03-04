FROM rockylinux:9
RUN dnf install epel-release -y
RUN dnf install lorax createrepo yum-utils -y

RUN mkdir /NInux
WORKDIR /NInux
RUN yumdownloader --resolve dhcpcd avahi avahi-tools
RUN createrepo -v /NInux

WORKDIR /