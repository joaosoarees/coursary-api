export class AppConfig {
  get mainTableName(): string {
    return AppConfig.requiredEnv('MAIN_TABLE_NAME');
  }

  get cognitoPoolId(): string {
    return AppConfig.requiredEnv('COGNITO_POOL_ID');
  }

  get cognitoClientId(): string {
    return AppConfig.requiredEnv('COGNITO_CLIENT_ID');
  }

  get cognitoClientSecret(): string {
    return AppConfig.requiredEnv('COGNITO_CLIENT_SECRET');
  }

  get catalogIndexQueueUrl(): string {
    return AppConfig.requiredEnv('CATALOG_INDEX_QUEUE_URL');
  }

  get algoliaParametersPath(): string {
    return AppConfig.requiredEnv('ALGOLIA_PARAMETERS_PATH');
  }

  get catalogIndexName(): string {
    return AppConfig.requiredEnv('CATALOG_INDEX_NAME');
  }

  get cognitoCleanupQueueUrl(): string {
    return AppConfig.requiredEnv('COGNITO_CLEANUP_QUEUE_URL');
  }

  // The sender of the domain e-mails, e.g. `Coursary <noreply@example.com>` (Q351).
  get mailFrom(): string {
    return AppConfig.requiredEnv('MAIL_FROM');
  }

  get mailQueueUrl(): string {
    return AppConfig.requiredEnv('MAIL_QUEUE_URL');
  }

  get courseDeletionQueueUrl(): string {
    return AppConfig.requiredEnv('COURSE_DELETION_QUEUE_URL');
  }

  get privateFilesBucket(): string {
    return AppConfig.requiredEnv('PRIVATE_FILES_BUCKET');
  }

  get publicAssetsBucket(): string {
    return AppConfig.requiredEnv('PUBLIC_ASSETS_BUCKET');
  }

  private static requiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Environment variable ${name} is not set.`);
    }

    return value;
  }
}
