{
  disko.devices = {
    zpool = {
      hddzpool = {
        type = "zpool";
        
        name = "hddzpool";
        mode = "raidz1";
        
        mountpoint = "/mnt/niployments-hard-storage";
        mountOptions = [ "defaults" ];
        
        options = {};
        rootFsOptions.compression = "zstd";
        
        datasets = {};
      };
    };
    
    disk = {
      main = {
        type = "disk";
        device = "/dev/sda";
        
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
      
      hdd1 = {
        type = "disk";
        device = "/dev/sdb";
        
        content = {
          type = "gpt";
          partitions = {
            zfs = {
              size = "100%";
              content = {
                type = "zfs";
                pool = "hddzpool";
              };
            };
          };
        };
      };
      
      hdd2 = {
        type = "disk";
        device = "/dev/sdc";
        
        content = {
          type = "gpt";
          partitions = {
            zfs = {
              size = "100%";
              content = {
                type = "zfs";
                pool = "hddzpool";
              };
            };
          };
        };
      };
      
      hdd3 = {
        type = "disk";
        device = "/dev/sdd";
        
        content = {
          type = "gpt";
          partitions = {
            zfs = {
              size = "100%";
              content = {
                type = "zfs";
                pool = "hddzpool";
              };
            };
          };
        };
      };
    };
  };
}