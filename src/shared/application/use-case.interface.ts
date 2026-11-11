/**
 * Contrato de todo caso de uso: una entrada, una salida, un metodo.
 * Un archivo = un caso de uso. Es lo que mantiene los PR pequenos y revisables.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/** Caso de uso sin parametros de entrada. */
export interface QueryUseCase<TOutput> {
  execute(): Promise<TOutput>;
}
