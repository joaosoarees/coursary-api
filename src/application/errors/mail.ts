export class MailBusy extends Error {
  constructor() {
    super('Another attempt is sending this e-mail.');
    this.name = 'MailBusy';
  }
}
