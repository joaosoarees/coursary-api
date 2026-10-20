// Sends the e-mails of the domain; the provider stays behind this port (Q38, Q294).
export interface MailGateway {
  send: (mail: MailGateway.Mail) => Promise<MailGateway.Sent>;
}

export namespace MailGateway {
  export interface Mail {
    to: string;
    subject: string;
    html: string;
    text: string;
  }

  export interface Sent {
    messageId: string;
  }
}
