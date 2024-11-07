export type PageProps<
  P extends
    | Record<string, string | string[] | undefined>
    | undefined = undefined,
  S extends
    | Record<string, string | string[] | undefined>
    | undefined = undefined,
> = {
  params: Promise<P extends never ? undefined : P>;
  searchParams: Promise<S extends never ? undefined : S>;
};
