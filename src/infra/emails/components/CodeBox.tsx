import { Text } from 'react-email';

export function CodeBox({ code }: { code: string }) {
  return (
    <Text className="m-0 inline-block rounded-md bg-zinc-100 px-8 py-4 text-3xl font-bold tracking-[12px] text-zinc-900">
      {code}
    </Text>
  );
}
