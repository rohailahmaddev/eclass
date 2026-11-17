type userRole = "ADMIN" | "TEACHER" | "STUDENT"

export type registerUserInput = {
  fullName : string,
  email : string,
  password : string,
  role : Exclude<userRole,"ADMIN">,
  file : File | null
}

export type user = {
  fullName : string,
  email : string,
  passwordHash : string,
  role : userRole,
  emailVerifiedAt : Date | null,
  avatarUrl : string | null,
  createAt : Date,
  updatedAt : Date,
  DeletedAt : Date | null
}

export type loginInput = {
  fullName : string,
  email : string,
  password : string
}

export type publicUser = {
  id : number,
  fullName : string,
  email : string,
  role : userRole
}

