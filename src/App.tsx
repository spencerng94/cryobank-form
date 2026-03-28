/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ClipboardList, 
  User, 
  Building2, 
  Hash, 
  Thermometer, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Trash2, 
  Plus,
  FileJson
} from 'lucide-react';
import { FormType, VendorFormData, PatientInfo } from './types';
import { FORM_CONFIGS } from './constants';
import { InputField } from './components/InputField';
import { SignaturePad } from './components/SignaturePad';
import { cn } from './lib/utils';

const INITIAL_DATA: VendorFormData = {
  referenceNumber: '',
  clientName: '',
  clientDob: '',
  coClientName: '',
  coClientDob: '',
  specimenTypes: [],
  otherSpecimenType: '',
  sendingClinic: '',
  numberOfCanes: '',
  numberOfStrawsVials: '',
  infectiousStatus: '',
  sendingTemp: '',
  loadingTime: '',
  sendingClinicStaffName: '',
  sendingClinicDate: new Date().toISOString().split('T')[0],
  
  // Receiving Clinic Section
  receivingClinic: '',
  receivingTemp: '',
  unloadingTimeReceiving: '',
  receivingClinicStaffName: '',
  receivingClinicDate: new Date().toISOString().split('T')[0],

  // CryoFuture Section
  shipperInspected: null,
  liquidNitrogenRefilled: null,
  cryoFacilityTemp: '',
  unloadingTime: '',
  shipperNumber: '',
  cryofutureStaffName: '',
  cryofutureDate: new Date().toISOString().split('T')[0],

  // Courier Section
  idVerified: false,
  receiptAcknowledged: false,
};

export default function App() {
  const [step, setStep] = useState<'SELECTION' | 'FORM' | 'REVIEW' | 'SUCCESS'>('SELECTION');
  const [selectedForm, setSelectedForm] = useState<FormType>('CLINIC_TO_CRYOFUTURE_BULK');
  const [formData, setFormData] = useState<VendorFormData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pdfBlob, setPdfBlob] = useState<{ blob: Blob, fileName: string } | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sticky form logic
  useEffect(() => {
    const savedData = localStorage.getItem('vendor_onboarding_data');
    const savedStep = localStorage.getItem('vendor_onboarding_step');

    if (savedData) setFormData(JSON.parse(savedData));
    if (savedStep && ['SELECTION', 'FORM', 'REVIEW', 'SUCCESS'].includes(savedStep)) {
      setStep(savedStep as any);
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const dataToSave = { ...formData };
      localStorage.setItem('vendor_onboarding_data', JSON.stringify(dataToSave));
      localStorage.setItem('vendor_onboarding_step', step);
      localStorage.setItem('vendor_onboarding_form', selectedForm);
    }
  }, [formData, step, selectedForm, isLoaded]);

  const validateForm = () => {
    if (!currentConfig) return false;
    const newErrors: Record<string, string> = {};
    
    // Check all fields defined in the config
    currentConfig.fields.forEach(fieldKey => {
      const field = fieldKey as keyof VendorFormData;
      const value = formData[field];
      
      if (field === 'specimenTypes') {
        if (!formData.specimenTypes || formData.specimenTypes.length === 0) {
          newErrors.specimenTypes = 'At least one specimen type is required';
        }
      } else if (field === 'shipperInspected' || field === 'liquidNitrogenRefilled') {
        if (formData[field] === null) {
          newErrors[field] = 'Selection is required';
        }
      } else if (value === undefined || value === '' || value === null) {
        // coClientName, coClientDob, and otherSpecimenType are optional
        if (field !== 'coClientName' && field !== 'coClientDob' && field !== 'otherSpecimenType') {
          newErrors[field] = 'This field is required';
        }
      }
    });

    // Only check Sending Clinic signature if it's a form that has a Sending Clinic section
    if (selectedForm !== 'CRYOFUTURE_TO_CLINIC_TRANSPORT') {
      if (!formData.sendingClinicSignatureBase64) {
        newErrors.sendingClinicSignatureBase64 = 'Sending Clinic signature is required';
      }
    }
    
    if (selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK') {
      if (!formData.cryofutureSignatureBase64) {
        newErrors.cryofutureSignatureBase64 = 'CryoFuture signature is required';
      }
    } else if (selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT') {
      if (!formData.receivingClinicSignatureBase64) {
        newErrors.receivingClinicSignatureBase64 = 'Receiving Clinic signature is required';
      }
      if (!formData.cryofutureSignatureBase64) {
        newErrors.cryofutureSignatureBase64 = 'CryoFuture Courier signature is required';
      }
      if (!formData.idVerified) {
        newErrors.idVerified = 'Identification must be verified';
      }
      if (!formData.receiptAcknowledged) {
        newErrors.receiptAcknowledged = 'Receipt must be acknowledged';
      }
    } else if (selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT') {
      if (!formData.cryofutureSignatureBase64) {
        newErrors.cryofutureSignatureBase64 = 'CryoFuture Staff signature is required';
      }
      if (!formData.receivingClinicSignatureBase64) {
        newErrors.receivingClinicSignatureBase64 = 'Receiving Clinic signature is required';
      }
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.getElementById(`field-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleReviewClick = () => {
    if (validateForm()) {
      setStep('REVIEW');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateField = React.useCallback((field: keyof VendorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const resetForm = () => {
    localStorage.removeItem('vendor_onboarding_data');
    localStorage.removeItem('vendor_onboarding_step');
    localStorage.removeItem('vendor_onboarding_form');
    setFormData(INITIAL_DATA);
    setStep('SELECTION');
    setErrors({});
    setPdfBlob(null);
  };

  const handleSendingClinicSignatureSave = React.useCallback((base64: string) => {
    updateField('sendingClinicSignatureBase64', base64);
  }, [updateField]);

  const handleSendingClinicSignatureClear = React.useCallback(() => {
    updateField('sendingClinicSignatureBase64', undefined);
  }, [updateField]);

  const handleCryofutureSignatureSave = React.useCallback((base64: string) => {
    updateField('cryofutureSignatureBase64', base64);
  }, [updateField]);

  const handleCryofutureSignatureClear = React.useCallback(() => {
    updateField('cryofutureSignatureBase64', undefined);
  }, [updateField]);

  const handleReceivingClinicSignatureSave = React.useCallback((base64: string) => {
    updateField('receivingClinicSignatureBase64', base64);
  }, [updateField]);

  const handleReceivingClinicSignatureClear = React.useCallback(() => {
    updateField('receivingClinicSignatureBase64', undefined);
  }, [updateField]);

  const currentConfig = FORM_CONFIGS.find(c => c.id === selectedForm);

  const renderFormFields = () => {
    if (!currentConfig) return null;

    const specimenOptions = [
      'EMBRYOS', 'DONOR EMBRYOS',
      'OOCYTES/EGGS', 'DONOR OOCYTES/EGGS',
      'SPERM', 'DONOR SPERM',
      'TESTICULAR TISSUE'
    ];

    return (
      <div className="space-y-12">
        {/* Section 1: Client Information */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white/90 uppercase tracking-tight flex items-center space-x-2">
              <User className="w-5 h-5 text-white/40" />
              <span>Client Information</span>
            </h3>
            <div className="w-64">
              <InputField 
                id="field-referenceNumber"
                label="Reference #" 
                icon={Hash} 
                value={formData.referenceNumber} 
                onChange={(v) => updateField('referenceNumber', v)} 
                prefix="CF #"
                error={errors.referenceNumber}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              id="field-clientName"
              label="Client Name" 
              value={formData.clientName} 
              onChange={(v) => updateField('clientName', v)} 
              error={errors.clientName}
            />
            <InputField 
              id="field-clientDob"
              label="Client DOB" 
              value={formData.clientDob} 
              onChange={(v) => updateField('clientDob', v)} 
              type="date"
              error={errors.clientDob}
            />
            <InputField 
              id="field-coClientName"
              label="Co-Client Name" 
              value={formData.coClientName} 
              onChange={(v) => updateField('coClientName', v)} 
              error={errors.coClientName}
            />
            <InputField 
              id="field-coClientDob"
              label="Co-Client DOB" 
              value={formData.coClientDob} 
              onChange={(v) => updateField('coClientDob', v)} 
              type="date"
              error={errors.coClientDob}
            />
          </div>
        </section>

        {/* Section 2: Specimen Type */}
        <section className="space-y-6" id="field-specimenTypes">
          <h3 className="text-xl font-bold text-white/90 uppercase tracking-tight flex items-center space-x-2 border-b border-white/10 pb-4">
            <ClipboardList className="w-5 h-5 text-white/40" />
            <span>Specimen Type</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {specimenOptions.map(option => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                <div 
                  onClick={() => {
                    const current = formData.specimenTypes || [];
                    const next = current.includes(option) 
                      ? current.filter(o => o !== option)
                      : [...current, option];
                    updateField('specimenTypes', next);
                  }}
                  className={cn(
                    "w-5 h-5 rounded border transition-all flex items-center justify-center",
                    formData.specimenTypes?.includes(option) 
                      ? "bg-white border-white" 
                      : "border-white/20 group-hover:border-white/40"
                  )}
                >
                  {formData.specimenTypes?.includes(option) && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">{option}</span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <InputField 
              id="field-otherSpecimenType"
              label="Other" 
              value={formData.otherSpecimenType} 
              onChange={(v) => updateField('otherSpecimenType', v)} 
              placeholder="Specify other specimen type"
              error={errors.otherSpecimenType}
            />
          </div>
          {errors.specimenTypes && <p className="text-xs text-red-500/80 animate-pulse">{errors.specimenTypes}</p>}
        </section>

        {/* Section 3: Sending Clinic (Yellow Section) - ONLY for Clinic to Clinic/CryoFuture */}
        {(selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' || selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT') && (
          <section className="p-8 rounded-[2rem] bg-yellow-400/10 border border-yellow-400/20 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400" />
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-yellow-400 uppercase tracking-tighter">Sending Clinic</h3>
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black tracking-widest">FILL OUT NEEDED</div>
            </div>
            
            <div className="space-y-6">
              <InputField 
                id="field-sendingClinic"
                label="Sending Clinic Name" 
                value={formData.sendingClinic} 
                onChange={(v) => updateField('sendingClinic', v)} 
                error={errors.sendingClinic}
                className="bg-black/20 border-yellow-400/20"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField 
                  id="field-numberOfCanes"
                  label="# of Canes" 
                  value={formData.numberOfCanes} 
                  onChange={(v) => updateField('numberOfCanes', v)} 
                  type="number"
                  error={errors.numberOfCanes}
                  className="bg-black/20 border-yellow-400/20"
                />
                <InputField 
                  id="field-numberOfStrawsVials"
                  label="# of Straws / Vials" 
                  value={formData.numberOfStrawsVials} 
                  onChange={(v) => updateField('numberOfStrawsVials', v)} 
                  type="number"
                  error={errors.numberOfStrawsVials}
                  className="bg-black/20 border-yellow-400/20"
                />
                <div className="flex flex-col space-y-2" id="field-infectiousStatus">
                  <label className="text-xs font-bold text-yellow-400/40 uppercase tracking-widest">Infectious Disease Status</label>
                  <div className="flex space-x-2 h-[52px]">
                    {['POSITIVE', 'NEGATIVE', 'UNKNOWN'].map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateField('infectiousStatus', option)}
                        className={cn(
                          "flex-1 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center px-1",
                          formData.infectiousStatus === option 
                            ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                            : "bg-black/20 text-yellow-400/40 border-yellow-400/20 hover:bg-yellow-400/5 hover:text-yellow-400/60"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.infectiousStatus && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.infectiousStatus}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField 
                  id="field-sendingTemp"
                  label="Temperature at Sending Clinic (°C)" 
                  value={formData.sendingTemp} 
                  onChange={(v) => updateField('sendingTemp', v)} 
                  error={errors.sendingTemp}
                  className="bg-black/20 border-yellow-400/20"
                />
                <InputField 
                  id="field-loadingTime"
                  label="Time of Specimen Loading" 
                  value={formData.loadingTime} 
                  onChange={(v) => updateField('loadingTime', v)} 
                  type="time"
                  error={errors.loadingTime}
                  className="bg-black/20 border-yellow-400/20"
                />
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-yellow-400/10">
                <p className="text-sm text-yellow-400/70 italic">
                  "I hereby confirm the release of cryopreserved specimens as listed above to be the specimens of the client(s)."
                </p>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold text-yellow-400/40 uppercase tracking-widest">Sending Clinic Staff</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    id="field-sendingClinicStaffName"
                    label="Name" 
                    value={formData.sendingClinicStaffName} 
                    onChange={(v) => updateField('sendingClinicStaffName', v)} 
                    error={errors.sendingClinicStaffName}
                    className="bg-black/20 border-yellow-400/20"
                  />
                  <InputField 
                    id="field-sendingClinicDate"
                    label="Date" 
                    value={formData.sendingClinicDate} 
                    onChange={(v) => updateField('sendingClinicDate', v)} 
                    type="date"
                    error={errors.sendingClinicDate}
                    className="bg-black/20 border-yellow-400/20"
                  />
                </div>
                <div className="space-y-2" id="field-sendingClinicSignatureBase64">
                  <label className="text-xs font-bold text-yellow-400/40 uppercase tracking-widest">Signature</label>
                  <SignaturePad 
                    onSave={handleSendingClinicSignatureSave} 
                    onClear={handleSendingClinicSignatureClear}
                    className="bg-black/40 border-yellow-400/20 h-32"
                  />
                  {errors.sendingClinicSignatureBase64 && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.sendingClinicSignatureBase64}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: CryoFuture Staff - ONLY for CryoFuture to Clinic */}
        {selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT' && (
          <section className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-white/40" />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">CryoFuture Staff</h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField 
                  id="field-numberOfCanes"
                  label="# of Canes" 
                  value={formData.numberOfCanes} 
                  onChange={(v) => updateField('numberOfCanes', v)} 
                  type="number"
                  error={errors.numberOfCanes}
                />
                <InputField 
                  id="field-numberOfStrawsVials"
                  label="# of Straws / Vials" 
                  value={formData.numberOfStrawsVials} 
                  onChange={(v) => updateField('numberOfStrawsVials', v)} 
                  type="number"
                  error={errors.numberOfStrawsVials}
                />
                <div className="flex flex-col space-y-2" id="field-infectiousStatus">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Infectious Disease Status</label>
                  <div className="flex space-x-2 h-[52px]">
                    {['POSITIVE', 'NEGATIVE', 'UNKNOWN'].map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateField('infectiousStatus', option)}
                        className={cn(
                          "flex-1 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center px-1",
                          formData.infectiousStatus === option 
                            ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                            : "bg-white/5 text-white/40 border-white/10 hover:bg-white/5 hover:text-white/60"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.infectiousStatus && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.infectiousStatus}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField 
                  id="field-sendingTemp"
                  label="Temperature at CryoFuture (°C)" 
                  value={formData.sendingTemp} 
                  onChange={(v) => updateField('sendingTemp', v)} 
                  error={errors.sendingTemp}
                />
                <InputField 
                  id="field-loadingTime"
                  label="Time of Specimen Loading" 
                  value={formData.loadingTime} 
                  onChange={(v) => updateField('loadingTime', v)} 
                  type="time"
                  error={errors.loadingTime}
                />
                <InputField 
                  id="field-shipperNumber"
                  label="Shipper #" 
                  value={formData.shipperNumber} 
                  onChange={(v) => updateField('shipperNumber', v)} 
                  error={errors.shipperNumber}
                />
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white/50 italic">
                  "I hereby confirmed the release of cryopreserved specimens as listed above to be the specimens of the client(s)."
                </p>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">CryoFuture Staff</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    id="field-cryofutureStaffName"
                    label="Name" 
                    value={formData.cryofutureStaffName} 
                    onChange={(v) => updateField('cryofutureStaffName', v)} 
                    error={errors.cryofutureStaffName}
                  />
                  <InputField 
                    id="field-cryofutureDate"
                    label="Date" 
                    value={formData.cryofutureDate} 
                    onChange={(v) => updateField('cryofutureDate', v)} 
                    type="date"
                    error={errors.cryofutureDate}
                  />
                </div>
                <div className="space-y-2" id="field-cryofutureSignatureBase64">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Signature</label>
                  <SignaturePad 
                    onSave={handleCryofutureSignatureSave} 
                    onClear={handleCryofutureSignatureClear}
                    className="bg-white/5 border-white/10 h-32"
                  />
                  {errors.cryofutureSignatureBase64 && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.cryofutureSignatureBase64}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 4: Receiving Clinic (Green Section) - ONLY for Clinic to Clinic / CryoFuture to Clinic */}
        {(selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT' || selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT') && (
          <section className="p-8 rounded-[2rem] bg-green-400/10 border border-green-400/20 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-green-400" />
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-green-400 uppercase tracking-tighter">Receiving Clinic</h3>
              <div className="bg-green-400 text-black px-3 py-1 rounded-full text-[10px] font-black tracking-widest">FILL OUT NEEDED</div>
            </div>
            
            <div className="space-y-6">
              <InputField 
                id="field-receivingClinic"
                label="Receiving Clinic Name" 
                value={formData.receivingClinic} 
                onChange={(v) => updateField('receivingClinic', v)} 
                error={errors.receivingClinic}
                className="bg-black/20 border-green-400/20"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField 
                  id="field-receivingTemp"
                  label="Temperature at Receiving Clinic (°C)" 
                  value={formData.receivingTemp} 
                  onChange={(v) => updateField('receivingTemp', v)} 
                  error={errors.receivingTemp}
                  className="bg-black/20 border-green-400/20"
                />
                <InputField 
                  id="field-unloadingTimeReceiving"
                  label="Time of Specimen Unloading" 
                  value={formData.unloadingTimeReceiving} 
                  onChange={(v) => updateField('unloadingTimeReceiving', v)} 
                  type="time"
                  error={errors.unloadingTimeReceiving}
                  className="bg-black/20 border-green-400/20"
                />
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-green-400/10">
                <p className="text-sm text-green-400/70 italic">
                  "I hereby confirm the receipt of cryopreserved specimens as listed above to be the specimens of the client(s)."
                </p>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold text-green-400/40 uppercase tracking-widest">Receiving Clinic Staff</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    id="field-receivingClinicStaffName"
                    label="Name" 
                    value={formData.receivingClinicStaffName} 
                    onChange={(v) => updateField('receivingClinicStaffName', v)} 
                    error={errors.receivingClinicStaffName}
                    className="bg-black/20 border-green-400/20"
                  />
                  <InputField 
                    id="field-receivingClinicDate"
                    label="Date" 
                    value={formData.receivingClinicDate} 
                    onChange={(v) => updateField('receivingClinicDate', v)} 
                    type="date"
                    error={errors.receivingClinicDate}
                    className="bg-black/20 border-green-400/20"
                  />
                </div>
                <div className="space-y-2" id="field-receivingClinicSignatureBase64">
                  <label className="text-xs font-bold text-green-400/40 uppercase tracking-widest">Signature</label>
                  <SignaturePad 
                    onSave={handleReceivingClinicSignatureSave} 
                    onClear={handleReceivingClinicSignatureClear}
                    className="bg-black/40 border-green-400/20 h-32"
                  />
                  {errors.receivingClinicSignatureBase64 && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.receivingClinicSignatureBase64}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 5: CryoFuture Courier / Clinic Section - NOT for CryoFuture to Clinic */}
        {selectedForm !== 'CRYOFUTURE_TO_CLINIC_TRANSPORT' && (
          <section className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-white/40" />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">
              {selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' ? 'CryoFuture' : 'CryoFuture Courier'}
            </h3>
            
            <div className="space-y-8">
              {selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => updateField('idVerified', !formData.idVerified)}>
                  <div className={cn(
                    "w-6 h-6 rounded border transition-all flex items-center justify-center",
                    formData.idVerified ? "bg-white border-white" : "border-white/20 group-hover:border-white/40"
                  )}>
                    {formData.idVerified && <CheckCircle2 className="w-5 h-5 text-black" />}
                  </div>
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">Identification of sending clinic staff verified</span>
                </div>
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => updateField('receiptAcknowledged', !formData.receiptAcknowledged)}>
                  <div className={cn(
                    "w-6 h-6 rounded border transition-all flex items-center justify-center",
                    formData.receiptAcknowledged ? "bg-white border-white" : "border-white/20 group-hover:border-white/40"
                  )}>
                    {formData.receiptAcknowledged && <CheckCircle2 className="w-5 h-5 text-black" />}
                  </div>
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">I acknowledge receipt of the cryopreserved specimens listed above for the client(s).</span>
                </div>
              </div>
            )}

            {selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Receipt Inspection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col space-y-3" id="field-shipperInspected">
                    <span className="text-sm text-white/70">Shipper condition inspected for damage or leaks?</span>
                    <div className="flex space-x-2">
                      {[true, false].map(val => (
                        <button
                          key={String(val)}
                          onClick={() => updateField('shipperInspected', val)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all border",
                            formData.shipperInspected === val 
                              ? "bg-white text-black border-white" 
                              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                          )}
                        >
                          {val ? 'YES' : 'NO'}
                        </button>
                      ))}
                    </div>
                    {errors.shipperInspected && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.shipperInspected}</p>}
                  </div>
                  <div className="flex flex-col space-y-3" id="field-liquidNitrogenRefilled">
                    <span className="text-sm text-white/70">Liquid Nitrogen refilled prior to unloading specimens?</span>
                    <div className="flex space-x-2">
                      {[true, false].map(val => (
                        <button
                          key={String(val)}
                          onClick={() => updateField('liquidNitrogenRefilled', val)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all border",
                            formData.liquidNitrogenRefilled === val 
                              ? "bg-white text-black border-white" 
                              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                          )}
                        >
                          {val ? 'YES' : 'NO'}
                        </button>
                      ))}
                    </div>
                    {errors.liquidNitrogenRefilled && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.liquidNitrogenRefilled}</p>}
                  </div>
                </div>
              </div>
            )}

            {selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField 
                  id="field-cryoFacilityTemp"
                  label="Temperature at CryoFuture Facility (°C)" 
                  value={formData.cryoFacilityTemp} 
                  onChange={(v) => updateField('cryoFacilityTemp', v)} 
                  error={errors.cryoFacilityTemp}
                />
                <InputField 
                  id="field-unloadingTime"
                  label="Time of Specimen Unloading" 
                  value={formData.unloadingTime} 
                  onChange={(v) => updateField('unloadingTime', v)} 
                  type="time"
                  error={errors.unloadingTime}
                />
              </div>
            )}

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/50 italic">
                {selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' 
                  ? '"I hereby confirm the receipt of cryopreserved specimens as listed above to be the specimens of the clients."'
                  : '"I acknowledge receipt of the cryopreserved specimens listed above for the client(s)."'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                id="field-shipperNumber"
                label="Shipper #" 
                value={formData.shipperNumber} 
                onChange={(v) => updateField('shipperNumber', v)} 
                error={errors.shipperNumber}
              />
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">CryoFuture Clinic Staff</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField 
                  id="field-cryofutureStaffName"
                  label="Name" 
                  value={formData.cryofutureStaffName} 
                  onChange={(v) => updateField('cryofutureStaffName', v)} 
                  error={errors.cryofutureStaffName}
                />
                <InputField 
                  id="field-cryofutureDate"
                  label="Date" 
                  value={formData.cryofutureDate} 
                  onChange={(v) => updateField('cryofutureDate', v)} 
                  type="date"
                  error={errors.cryofutureDate}
                />
              </div>
              <div className="space-y-2" id="field-cryofutureSignatureBase64">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Signature</label>
                <SignaturePad 
                  onSave={handleCryofutureSignatureSave} 
                  onClear={handleCryofutureSignatureClear}
                  className="h-32"
                />
                {errors.cryofutureSignatureBase64 && <p className="text-[10px] text-red-500/80 animate-pulse">{errors.cryofutureSignatureBase64}</p>}
              </div>
            </div>
          </div>
        </section>
        )}
      </div>
    );
  };

  const renderReview = () => {
    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">Client Information</h4>
            <div className="space-y-2">
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Ref #:</span> CF # {formData.referenceNumber}</p>
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Client:</span> {formData.clientName}</p>
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Client DOB:</span> {formData.clientDob}</p>
              {formData.coClientName && (
                <>
                  <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Co-Client:</span> {formData.coClientName}</p>
                  <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Co-Client DOB:</span> {formData.coClientDob}</p>
                </>
              )}
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Specimens:</span> {formData.specimenTypes?.join(', ')}</p>
              {formData.otherSpecimenType && <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Other:</span> {formData.otherSpecimenType}</p>}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">
              {selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT' ? 'CryoFuture Staff' : 'Sending Clinic'}
            </h4>
            <div className="space-y-2">
              {selectedForm !== 'CRYOFUTURE_TO_CLINIC_TRANSPORT' && (
                <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Clinic:</span> {formData.sendingClinic}</p>
              )}
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Canes:</span> {formData.numberOfCanes}</p>
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Straws/Vials:</span> {formData.numberOfStrawsVials}</p>
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Infectious Status:</span> {formData.infectiousStatus}</p>
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Temp:</span> {formData.sendingTemp}°C</p>
              <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Loading Time:</span> {formData.loadingTime}</p>
              {selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT' && (
                <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Shipper #:</span> {formData.shipperNumber}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' ? (
            <div className="space-y-4">
              <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">CryoFuture Receipt</h4>
              <div className="space-y-2">
                <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Shipper Inspected:</span> {formData.shipperInspected ? 'YES' : 'NO'}</p>
                <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">LN2 Refilled:</span> {formData.liquidNitrogenRefilled ? 'YES' : 'NO'}</p>
                <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Facility Temp:</span> {formData.cryoFacilityTemp}°C</p>
                <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Unloading Time:</span> {formData.unloadingTime}</p>
                <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Shipper #:</span> {formData.shipperNumber}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">Receiving Clinic</h4>
                <div className="space-y-2">
                  <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Clinic:</span> {formData.receivingClinic}</p>
                  <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Temp:</span> {formData.receivingTemp}°C</p>
                  <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Unloading Time:</span> {formData.unloadingTimeReceiving}</p>
                </div>
              </div>
              {selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT' && (
                <div className="space-y-4">
                  <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">Courier Verification</h4>
                  <div className="space-y-2">
                    <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">ID Verified:</span> {formData.idVerified ? 'YES' : 'NO'}</p>
                    <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Receipt Acknowledged:</span> {formData.receiptAcknowledged ? 'YES' : 'NO'}</p>
                    <p className="text-[#ffffffcc]"><span className="text-[#ffffff66]">Shipper #:</span> {formData.shipperNumber}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">
              {selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT' ? 'CryoFuture Clinic Staff' : 'Sending Clinic Staff'}
            </h4>
            <div className="p-6 rounded-2xl border border-[#ffffff1a] bg-[#ffffff0d] space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold">Name</p>
                  <p className="text-[#ffffffcc] text-sm font-medium">
                    {selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT' ? formData.cryofutureStaffName : formData.sendingClinicStaffName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold">Date</p>
                  <p className="text-[#ffffffcc] text-sm font-medium">
                    {selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT' ? formData.cryofutureDate : formData.sendingClinicDate}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-[#ffffff0d]">
                <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold mb-2">Signature</p>
                <div className="h-16 flex items-center overflow-hidden">
                  {selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT' ? (
                    formData.cryofutureSignatureBase64 && (
                      <img src={formData.cryofutureSignatureBase64} alt="Signature" className="max-h-full max-w-full object-contain" />
                    )
                  ) : (
                    formData.sendingClinicSignatureBase64 && (
                      <img src={formData.sendingClinicSignatureBase64} alt="Signature" className="max-h-full max-w-full object-contain" />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
          {(selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT' || selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT') && (
            <div className="space-y-4">
              <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">Receiving Clinic Staff</h4>
              <div className="p-6 rounded-2xl border border-[#ffffff1a] bg-[#ffffff0d] space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold">Name</p>
                    <p className="text-[#ffffffcc] text-sm font-medium">{formData.receivingClinicStaffName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold">Date</p>
                    <p className="text-[#ffffffcc] text-sm font-medium">{formData.receivingClinicDate}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#ffffff0d]">
                  <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold mb-2">Signature</p>
                  <div className="h-16 flex items-center overflow-hidden">
                    {formData.receivingClinicSignatureBase64 && (
                      <img src={formData.receivingClinicSignatureBase64} alt="Signature" className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {selectedForm !== 'CRYOFUTURE_TO_CLINIC_TRANSPORT' && (
            <div className="space-y-4">
              <h4 className="text-[14px] font-bold text-[#ffffff66] uppercase tracking-widest">
                {selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' ? 'CryoFuture Clinic Staff' : 'CryoFuture Courier Staff'}
              </h4>
              <div className="p-6 rounded-2xl border border-[#ffffff1a] bg-[#ffffff0d] space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold">Name</p>
                    <p className="text-[#ffffffcc] text-sm font-medium">{formData.cryofutureStaffName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold">Date</p>
                    <p className="text-[#ffffffcc] text-sm font-medium">{formData.cryofutureDate}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#ffffff0d]">
                  <p className="text-[#ffffff66] text-[10px] uppercase tracking-widest font-bold mb-2">Signature</p>
                  <div className="h-16 flex items-center overflow-hidden">
                    {formData.cryofutureSignatureBase64 && (
                      <img src={formData.cryofutureSignatureBase64} alt="Signature" className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    const finalPayload = {
      formId: selectedForm,
      formTitle: currentConfig?.title,
      timestamp: new Date().toISOString(),
      data: formData
    };
    console.log('Final Submission Payload:', finalPayload);

    // PDF Generation
    if (reviewRef.current) {
      try {
        const canvas = await html2canvas(reviewRef.current, {
          scale: 2,
          backgroundColor: '#0a0a0a',
          logging: false,
          useCORS: true,
          onclone: (clonedDoc) => {
            const elements = clonedDoc.querySelectorAll('*');
            elements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const style = window.getComputedStyle(el);
              
              // Replace oklch/oklab with safe fallbacks in inline styles
              // html2canvas will prioritize inline styles over computed ones in some cases
              // or at least we can try to override them here.
              if (style.color.includes('oklch') || style.color.includes('oklab')) {
                htmlEl.style.color = '#ffffff';
              }
              if (style.backgroundColor.includes('oklch') || style.backgroundColor.includes('oklab')) {
                // If it's a background color with transparency, we might lose it, but it's better than a crash
                htmlEl.style.backgroundColor = htmlEl.tagName === 'DIV' && htmlEl.classList.contains('bg-white/5') 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'transparent';
              }
              if (style.borderColor.includes('oklch') || style.borderColor.includes('oklab')) {
                htmlEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }
              
              // Remove filters and backdrops which are not supported and might cause issues
              htmlEl.style.backdropFilter = 'none';
              htmlEl.style.filter = 'none';
              htmlEl.style.boxShadow = 'none';
            });
          }
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        
        // Naming Convention
        const date = new Date();
        const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getFullYear()).slice(-2)}`;
        const clientName = formData.clientName?.trim().replace(/\s+/g, '_') || 'Unknown_Client';
        
        let prefix = '';
        if (selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK') prefix = 'C2CF';
        else if (selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT') prefix = 'C2C';
        else if (selectedForm === 'CRYOFUTURE_TO_CLINIC_TRANSPORT') prefix = 'CF2C';
        
        const fileName = `${prefix}_${clientName}_${formattedDate}.pdf`;
        
        // Save to state for later download
        const blob = pdf.output('blob');
        setPdfBlob({ blob, fileName });
        
        pdf.save(fileName);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    }

    setStep('SUCCESS');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/20">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-24">
        <header className="mb-16 space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3 text-white/60"
          >
            <Building2 className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest uppercase">CryoFuture Portal</span>
          </motion.div>
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl lg:text-7xl font-bold tracking-tight"
              >
                {step === 'SELECTION' ? (
                  <>Select <span className="text-white/40 italic">Form</span></>
                ) : selectedForm === 'CLINIC_TO_CRYOFUTURE_BULK' ? (
                  <>Clinic to <span className="text-white/40 italic">CryoFuture</span></>
                ) : selectedForm === 'CLINIC_TO_CLINIC_TRANSPORT' ? (
                  <>Clinic to <span className="text-white/40 italic">Clinic</span></>
                ) : (
                  <>CryoFuture to <span className="text-white/40 italic">Clinic</span></>
                )}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-white/40 max-w-2xl"
              >
                {step === 'SELECTION' 
                  ? "Choose the appropriate verification form to begin the onboarding process."
                  : "Local Verification Form. Secure, efficient, and paperless."
                }
              </motion.p>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {step === 'SELECTION' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl"
            >
              {FORM_CONFIGS.map((config, index) => (
                <motion.button
                  key={config.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  onClick={() => {
                    setSelectedForm(config.id);
                    setStep('FORM');
                    setErrors({});
                  }}
                  className="group relative p-8 rounded-[2.5rem] border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ClipboardList className="w-24 h-24" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{config.title}</h3>
                      <p className="text-white/40 text-sm leading-relaxed">{config.description}</p>
                    </div>
                    <div className="pt-4 flex items-center text-xs font-bold tracking-widest uppercase text-white/20 group-hover:text-white transition-colors">
                      <span>Start Form</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {step === 'FORM' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl"
            >
              <div className="mb-12 flex items-center justify-between">
                <button 
                  onClick={() => setStep('SELECTION')}
                  className="flex items-center space-x-2 text-white/40 hover:text-white transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-medium">Back to Selection</span>
                </button>
                <div className="text-right">
                  <h2 className="text-2xl font-bold">{currentConfig?.title}</h2>
                  <p className="text-sm text-white/40">{currentConfig?.description}</p>
                </div>
              </div>

              <div className="p-8 lg:p-12 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
                {renderFormFields()}

                <div className="mt-12 flex items-center justify-between">
                  <button 
                    onClick={resetForm}
                    className="flex items-center space-x-2 px-6 py-3 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Reset Form</span>
                  </button>
                  <button 
                    onClick={handleReviewClick}
                    className={cn(
                      "flex items-center space-x-2 px-8 py-4 rounded-2xl font-bold transition-all bg-white text-black hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    <span>Review Submission</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'REVIEW' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-4xl"
            >
              <div className="mb-12 flex items-center justify-between">
                <button 
                  onClick={() => setStep('FORM')}
                  className="flex items-center space-x-2 text-white/40 hover:text-white transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-medium">Back to Editing</span>
                </button>
                <div className="text-right">
                  <h2 className="text-2xl font-bold">Review Details</h2>
                  <p className="text-sm text-white/40">Please verify all information is correct</p>
                </div>
              </div>

              <div ref={reviewRef} className="p-8 lg:p-12 rounded-[2rem] border border-[#ffffff1a] bg-[#0a0a0a] shadow-2xl">
                {renderReview()}

                <div data-html2canvas-ignore className="mt-12 flex items-center justify-end space-x-4">
                  <button 
                    onClick={handleSubmit}
                    className="flex items-center space-x-2 px-10 py-5 bg-white text-black rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/10"
                  >
                    <Save className="w-5 h-5" />
                    <span>Complete Onboarding</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'SUCCESS' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto text-center py-24"
            >
              <div className="inline-flex p-6 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
                <CheckCircle2 className="w-16 h-16 text-green-400" />
              </div>
              <h2 className="text-4xl font-bold mb-4">Onboarding Complete</h2>
              <p className="text-white/40 text-lg mb-12">
                Your digital verification form has been successfully submitted and logged. A copy has been sent to the clinic coordinators.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setStep('REVIEW')}
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all"
                >
                  Back to Review
                </button>
                <button 
                  onClick={resetForm}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-2xl font-bold hover:scale-[1.05] transition-all"
                >
                  Start New Session
                </button>
                {pdfBlob && (
                  <button 
                    onClick={() => {
                      const url = URL.createObjectURL(pdfBlob.blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = pdfBlob.fileName;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Download PDF</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    const dataStr = JSON.stringify(formData, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `form_data_${new Date().toISOString()}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                >
                  <FileJson className="w-5 h-5" />
                  <span>Download JSON</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-white/20 text-xs tracking-widest uppercase">
            &copy; 2026 CryoFuture Logistics &bull; HIPAA Compliant &bull; End-to-End Encrypted
          </p>
        </footer>
      </div>
    </div>
  );
}
