import { DomainError } from "./domain-error";

// D-74: negar permissão não é erro de payload. O error handler trata esta classe antes do
// DomainError genérico e responde 403, que é o que o OpenAPI já documentava para estas regras.
// O domínio continua sem qualquer referência a HTTP — quem traduz é a camada de infra.
export class DomainPermissionError extends DomainError {}
