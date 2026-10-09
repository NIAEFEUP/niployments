{
  lib,
  config,
  ...
}: let
  cfg = config.niployments.vm;
in {
  options.niployments.vm = {
    enable = lib.mkOption {
      default = true;
      description = ''
        Whether to configure the NixOS host as a VM.
      '';
      type = lib.types.bool;
    };
  };

  config =
    lib.mkIf cfg.enable {
    };
}
