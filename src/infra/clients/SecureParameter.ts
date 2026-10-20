import { GetParameterCommand } from '@aws-sdk/client-ssm';

import { ssmClient } from '@infra/clients/ssmClient';

// A SecureString read once per container, never through the template (Q305).
export class SecureParameter {
  private value: Promise<string> | undefined;

  constructor(private readonly name: string) {}

  get(): Promise<string> {
    this.value ??= this.read();

    return this.value;
  }

  private async read(): Promise<string> {
    try {
      const { Parameter } = await ssmClient.send(
        new GetParameterCommand({ Name: this.name, WithDecryption: true }),
      );

      if (!Parameter?.Value) {
        throw new Error(`Parameter ${this.name} has no value.`);
      }

      return Parameter.Value;
    } catch (error) {
      // The next message tries again instead of keeping the failure.
      this.value = undefined;
      throw error;
    }
  }
}
