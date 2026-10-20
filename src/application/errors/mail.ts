// Another attempt is sending the same e-mail; the message comes back later (Q350).
export class MailBusy extends Error {
  constructor() {
    super('Another attempt is sending this e-mail.');
    this.name = 'MailBusy';
  }
}
