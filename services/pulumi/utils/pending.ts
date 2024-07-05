import * as pulumi from "@pulumi/pulumi";

type CommitSignalOptions = {
    resource?: pulumi.Resource;
    rejectIfNotCommitted?: boolean;
}

const warnMessage = "This may affect the deployment of certain resources.";

export class CommitSignal {
    public static globalParent = new CommitSignal();

    private committed = false;
    private action = Promise.withResolvers<void>();

    public resource;

    constructor(opts?: CommitSignalOptions) {
        this.resource = opts?.resource;

        this.action.promise.finally(() => {
            if (this.committed)
                return;

            pulumi.log.error(`Commit was not committed. ${warnMessage}`, this.resource);
        });

        if (this !== CommitSignal.globalParent)
            this.attachTo(CommitSignal.globalParent, opts?.rejectIfNotCommitted);
    }

    public waitForCommit() {
        return this.action.promise;
    }

    public resolve() {
        if (this.committed) {
            pulumi.log.error(`Commit resolved after being committed. ${warnMessage}`, this.resource);
            return;
        }

        this.committed = true;
        this.action.resolve();
    }
 
    public reject(error: Error) {
        if (this.committed) {
            pulumi.log.error(`Commit rejected after being committed. ${warnMessage}`, this.resource);
            return;
        }

        this.committed = true;
        this.action.reject(error);
    }

    public attachTo(parent: CommitSignal, rejectIfNotCommitted?: boolean) {
        if (parent.committed) {
            pulumi.log.warn(`Commit attached when parent was already committed. ${warnMessage}`, this.resource);
            return;
        }

        rejectIfNotCommitted ??= false;

        parent.action.promise
            .then(() => {
                if (this.committed)
                    return;

                if (rejectIfNotCommitted) {
                    this.reject(new Error("Commit was not committed before parent."));
                } else {
                    this.resolve();
                }
            })
            .catch(err => {
                if (this.committed)
                    return;
                
                this.reject(err);
            });
    }
}

type PendingValueOptions = { commitSignal?: CommitSignal }

export class PendingValue<T> {

    public readonly commit;

    constructor(private value: T, opts?: PendingValueOptions) {
        this.commit = opts?.commitSignal ?? new CommitSignal();
    }

    public run(func: (value: T) => void) {
        func(this.get());
    }

    public get() {
        return this.value;
    }

    public asOutput() {
        return pulumi.output(this.waitForValue());
    }

    public async waitForValue() {
        await this.commit.waitForCommit();
        return this.value;
    }
}
