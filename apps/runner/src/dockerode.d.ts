declare module "dockerode" {
  interface ContainerWaitData {
    StatusCode: number;
  }

  interface Container {
    attach(options: Record<string, unknown>): Promise<NodeJS.ReadableStream>;
    start(): Promise<void>;
    kill(): Promise<void>;
    wait(
      callback: (error: Error | null, data: ContainerWaitData | null) => void,
    ): void;
  }

  interface DockerOptions {
    socketPath?: string;
  }

  export default class Docker {
    constructor(options?: DockerOptions);
    createContainer(options: Record<string, unknown>): Promise<Container>;
  }
}
