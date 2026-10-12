/** An edit that cannot be made: the score is left as it was, and the reason given. */
export class EditError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EditError';
  }
}
