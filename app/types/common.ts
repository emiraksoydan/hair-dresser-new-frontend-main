/**
 * Common types used across the application
 */

export type ApiResponse<T> = {
  success: boolean;
  message?: string; // Optional - backend'den bazen gelmeyebilir
  data: T;
};

export type FileObject = { 
  uri: string; 
  name: string; 
  type: string 
};

export type Pos = { 
  lat: number; 
  lon: number 
};

export enum BarberType {
  MaleHairdresser = 0,
  FemaleHairdresser = 1,
  BeautySalon = 2,
}

export interface ServiceOfferingGetDto {
  id: string;
  price: number;
  serviceName: string;
}

export interface ImageGetDto {
  id: string;
  imageUrl: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface CategoryHierarchyDto {
  id: string;
  name: string;
  children: CategoryHierarchyDto[];
}

export interface DailyEarningDto {
  date: string; // yyyy-MM-dd
  amount: number;
}

export interface EarningsDto {
  totalEarnings: number;
  dailyEarnings: number;
  previousPeriodEarnings: number;
  changePercent: number;
  dailyBreakdown: DailyEarningDto[];
}

export interface AIAssistantResponseDto {
  response: string;
  intent: string;
  actionTaken: boolean;
  affectedAppointmentId?: string | null;
}