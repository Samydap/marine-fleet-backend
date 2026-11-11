export interface PageMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
}

export class PageResult<T> {
  readonly meta: PageMeta;

  constructor(
    readonly data: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    this.meta = { page, limit, total, totalPages, hasNext: page < totalPages };
  }

  /** Mapea el contenido conservando la metainformacion de la pagina. */
  map<U>(fn: (item: T) => U): PageResult<U> {
    return new PageResult(this.data.map(fn), this.meta.total, this.meta.page, this.meta.limit);
  }
}
