import bcrypt from "bcryptjs";

export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

export async function comparePin(enteredPin: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(enteredPin, storedHash);
}
