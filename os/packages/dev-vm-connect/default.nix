{
  writeShellApplication,
  openssh,
}:

let
  mkVmConnect = hostConfiguration: writeShellApplication {
    name = "dev-${hostConfiguration.config.system.name}-vm-connect";
    runtimeInputs = [openssh];
    text = ''
      ssh \
        -o StrictHostKeyChecking=no
        -o 
    '';
  };
in mkVmConnect

