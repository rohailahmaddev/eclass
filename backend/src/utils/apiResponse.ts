export class ApiResponse <T>{
  statusCode:number;
  data: T | null;
  message: string;
  success:boolean;

  constructor(
    statusCode:number,
    data: T | null =null,
    message = "Request successful",
) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
  }
}
