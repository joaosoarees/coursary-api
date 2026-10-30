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
