import readContract from './readContract';

const canMessageOnContract = async (
  firstAddress: string,
  secondAddress: string,
): Promise<boolean> => {
  const result = await readContract('can_message', [
    { type: 'address', value: firstAddress },
    { type: 'address', value: secondAddress },
  ]);

  if (typeof result !== 'boolean') {
    throw new TypeError('can_message returned a non-boolean result');
  }

  return result;
};

export default canMessageOnContract;
