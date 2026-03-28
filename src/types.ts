/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PatientInfo {
  legalName: string;
  dob: string;
  specimenType: 'EMBRYO(S)' | 'OOCYTE(S)' | 'SPERM';
  qtyCanes: string;
  qtyVialsStraws: string;
  notes: string;
}

export interface VendorFormData {
  // Client Information
  referenceNumber: string; // CF #
  clientName: string;
  clientDob: string;
  coClientName: string;
  coClientDob: string;

  // Specimen Type
  specimenTypes: string[]; // EMBRYOS, DONOR EMBRYOS, etc.
  otherSpecimenType: string;

  // Sending Clinic Section
  sendingClinic: string;
  numberOfCanes: string;
  numberOfStrawsVials: string;
  infectiousStatus: 'POSITIVE' | 'NEGATIVE' | 'UNKNOWN' | '';
  sendingTemp: string;
  loadingTime: string;
  sendingClinicStaffName: string;
  sendingClinicSignatureBase64?: string;
  sendingClinicDate: string;

  // Receiving Clinic Section (For Clinic to Clinic Transport)
  receivingClinic: string;
  receivingTemp: string;
  unloadingTimeReceiving: string;
  receivingClinicStaffName: string;
  receivingClinicSignatureBase64?: string;
  receivingClinicDate: string;

  // CryoFuture Section (For Clinic to CryoFuture)
  shipperInspected: boolean | null;
  liquidNitrogenRefilled: boolean | null;
  cryoFacilityTemp: string;
  unloadingTime: string;
  shipperNumber: string;
  cryofutureStaffName: string;
  cryofutureSignatureBase64?: string;
  cryofutureDate: string;

  // Courier Section (For Clinic to Clinic Transport)
  idVerified: boolean;
  receiptAcknowledged: boolean;
}

export type FormType = 
  | 'CLINIC_TO_CRYOFUTURE_BULK'
  | 'CLINIC_TO_CLINIC_TRANSPORT'
  | 'CRYOFUTURE_TO_CLINIC_TRANSPORT';

export interface FormConfig {
  id: FormType;
  title: string;
  description: string;
  fields: string[]; // Keys of VendorFormData
}
