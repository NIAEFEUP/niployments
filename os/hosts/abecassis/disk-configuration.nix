{
  disko.devices = {
    disk = {
      main = {
        type = "disk";
        device = "/dev/sda";
        imageSize = "16G";
        
        content = {
          type = "gpt";
          partitions = {
            ESP = {
              priority = 1;
              label = "efi";
              type = "EF00";
              size = "500M";
              content = {
                type = "filesystem";
                format = "vfat";
                mountpoint = "/boot";
                mountOptions = [ "umask=0077" ];
              };
            };
            
            nixos = {
              priority = 2;
              label = "nixos";
              end = "-0";
              content = {
                type = "filesystem";
                format = "ext4";
                mountpoint = "/";
              };
            };
          };
        };
      };
    };
  };
}