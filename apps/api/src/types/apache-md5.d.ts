declare module "apache-md5" {
  export default function apr1(password: string, salt?: string): string;
}
