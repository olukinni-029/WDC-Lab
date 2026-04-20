import { IUser, UserModel } from "../models/user.model";

export class UserService {
    static async findUserById(userId: string): Promise<IUser | null> {
        return UserModel.findById(userId);
    }
    static async findOneByIdAndUpdate(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
        return UserModel.findByIdAndUpdate(userId, updateData, { new: true });
    }

     static async findByEmail(email: string) {
    return UserModel.findOne({ email });
  }

  public static async createLender(userData: IUser) {
    return UserModel.create(userData);
  }
}
