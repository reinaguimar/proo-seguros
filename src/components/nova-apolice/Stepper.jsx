import React from 'react';
import { Check } from 'lucide-react';

export default function Stepper({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-md border-blue-100">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isActive ? 'bg-blue-600 text-white border-blue-600' : ''}
                  ${isCompleted ? 'bg-green-500 text-white border-green-500' : ''}
                  ${!isActive && !isCompleted ? 'bg-slate-100 border-slate-200 text-slate-500' : ''}
                `}
              >
                {isCompleted ? <Check className="w-6 h-6" /> : <span className="font-bold text-lg">{stepNumber}</span>}
              </div>
              <p className={`mt-2 text-xs md:text-sm font-medium transition-colors duration-300
                ${isActive ? 'text-blue-600' : 'text-slate-500'}
              `}>
                {step}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-4 rounded-full transition-colors duration-300
                ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}
              `}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}