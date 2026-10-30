export interface MailTemplates {
  welcome: (params: { name: string }) => Promise<MailTemplates.Content>;

  courseArchived: (params: {
    name: string;
    title: string;
  }) => Promise<MailTemplates.Content>;
}

export namespace MailTemplates {
  export interface Content {
    subject: string;
    html: string;
    text: string;
  }
}
