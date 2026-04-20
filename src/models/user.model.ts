import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;

  password: string;

  referralCode?: string;
  referredBy?: string;

  role: "user" | "admin";

  isEmailVerified: boolean;
  isActive: boolean;

  authId: string;

  walletBalance: number;

  track?: string;
  experienceLevel?: string;
  userLevel?: string;

  skills?: string[];

  averageScore?: number;

  currentStreak?: number;
  publicKey?: string;
  privateKey?: string;

  lastActivityDate?: Date;
  lastActiveAt?: Date;

  hasCompletedOnboarding?: boolean;
  hasCompletedTour?: boolean;
  isFirstTask?: boolean;

  cvUrl?: string;

  country?: string;
  nationality?: string;
  address?: string;
  dateOfBirth?: Date;
  occupation?: string;

  bankName?: string;
  accountNumber?: string;
  accountName?: string;

  idVerified?: boolean;
  bvn?: string;
  nin?: string;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: false },

    password: { type: String, required: true },

    referralCode: { type: String },
    referredBy: { type: String },

    role: { type: String, enum: ["user", "admin"], default: "user" },

    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    publicKey: { type: String },
    privateKey: { type: String }, 

    authId: { type: String, unique: true },

    walletBalance: { type: Number, default: 0 },

    track: { type: String },
    experienceLevel: { type: String },
    userLevel: { type: String },

    skills: { type: [String], default: [] },

    averageScore: { type: Number, default: 0 },

    currentStreak: { type: Number, default: 0 },

    lastActivityDate: { type: Date },
    lastActiveAt: { type: Date, default: Date.now },

    hasCompletedOnboarding: { type: Boolean, default: false },
    hasCompletedTour: { type: Boolean, default: false },

    isFirstTask: { type: Boolean, default: true },

    cvUrl: { type: String },

    country: { type: String },
    nationality: { type: String },
    address: { type: String },
    dateOfBirth: { type: Date },
    occupation: { type: String },

    bankName: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },

    idVerified: { type: Boolean, default: false },
    bvn: { type: String },
    nin: { type: String },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>("User", userSchema);