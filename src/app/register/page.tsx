
"use client";

import Link from "next/link"
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, useFirestore, errorEmitter } from "@/firebase";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import { FirebaseError } from "firebase/app";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";

const validationSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormValues = z.infer<typeof validationSchema>;


export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(validationSchema),
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!auth || !firestore) {
      toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Firebase is not available. Please try again later.",
      });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      const isAdminEmail = data.email.toLowerCase() === 'waseemsamra@gmail.com';
      const roles = isAdminEmail ? ['ADMIN'] : ['CUSTOMER'];

      const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        email: user.email!,
        name: `${data.firstName} ${data.lastName}`,
        roles: roles,
        customerType: "ONLINE",
        accountStatus: 'active',
      };
      
      const userDocRef = doc(firestore, "users", user.uid);
      
      const dataToSet = { 
        ...newUser, 
        id: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(userDocRef, dataToSet).catch(async (error) => {
          const permissionError = await FirestorePermissionError.create({
              path: userDocRef.path,
              operation: 'create',
              requestResourceData: dataToSet,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw error;
      });

      toast({
          title: "Account Created",
          description: "You have been successfully registered.",
      });
      
      router.push('/login');

    } catch (error: any) {
      if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "This email is already registered. Please login instead.",
        });
      } else if (error.name !== 'FirebaseError') { 
         console.error("An unexpected error occurred during auth creation:", error);
         toast({
          variant: "destructive",
          title: "Registration Error",
          description: "An unexpected error occurred during account creation. Please try again.",
        });
      }
    }
  };
  return (
     <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input id="first-name" placeholder="Max" {...register("firstName")} disabled={isSubmitting} />
                 {errors.firstName && <p className="text-destructive text-sm">{errors.firstName.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input id="last-name" placeholder="Robinson" {...register("lastName")} disabled={isSubmitting} />
                {errors.lastName && <p className="text-destructive text-sm">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
                disabled={isSubmitting}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} disabled={isSubmitting} />
              {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Create an account"}
            </Button>
            <Button variant="outline" className="w-full" type="button" disabled={isSubmitting}>
              Sign up with Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
