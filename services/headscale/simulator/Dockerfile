FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    iproute2 \
    iptables \
    nano \
    openssh-server \
    python3 \
  && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -fsSLo /usr/local/bin/kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
  && chmod +x /usr/local/bin/kubectl

# Install tailscale + tailscaled
RUN curl -fsSL https://tailscale.com/install.sh | sh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /var/run/sshd /var/lib/tailscale-official /var/lib/tailscale-headscale /opt/headscale

# Local dev credentials for simulator only
RUN echo "root:raspberry" | chpasswd \
  && sed -i "s/#PermitRootLogin prohibit-password/PermitRootLogin yes/" /etc/ssh/sshd_config \
  && sed -i "s@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g" /etc/pam.d/sshd

EXPOSE 22

ENTRYPOINT ["/entrypoint.sh"]
