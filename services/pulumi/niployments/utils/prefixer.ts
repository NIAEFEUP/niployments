export class Prefixer<const T extends string> {
  constructor(private readonly prefix: T) {}

  public base() {
    return this.prefix;
  }

  public chain<const U extends string>(prefix: U) {
    return new Prefixer(this.create(prefix));
  }

  public create<const U extends string>(name: U) {
    return `${this.prefix}-${name}` as const;
  }

  public deployment() {
    return this.create("deployment");
  }
  
  public service() {
    return this.create("service");
  }

  public ingressRoute() {
    return this.create("ingress-route");
  }

  public certificate() {
    return this.create("certificate");
  }

  public namespace() {
    return this.create("namespace");
  }
}



