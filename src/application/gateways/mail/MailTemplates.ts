// Writes the domain e-mails; the rendering stays out of the application (Q351).
export interface MailTemplates {
  welcome: (params: { name: string }) => Promise<MailTemplates.Content>;
}

export namespace MailTemplates {
  export interface Content {
    subject: string;
    html: string;
    text: string;
  }
}
