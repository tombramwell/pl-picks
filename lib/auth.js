import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import OTP from "@/models/OTP";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        const normalizedEmail = credentials.email.toLowerCase().trim();
        await dbConnect();

        // Find matching active code in MongoDB
        const validOtp = await OTP.findOne({
          email: normalizedEmail,
          code: credentials.code.trim()
        });

        if (!validOtp) {
          throw new Error("Invalid or expired code. Please try again.");
        }

        // Delete used code
        await OTP.deleteOne({ _id: validOtp._id });

        // Return user session object
        return {
          id: normalizedEmail,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0]
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.email) {
        session.user.email = token.email;
        session.user.id = token.email;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login', // Custom login page
  }
};