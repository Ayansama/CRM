'use client';

import React, { useState } from 'react';
import { UploadCloud, Plus } from 'lucide-react';
import SourceCard from '../../components/sources/SourceCard';
import ImportWizard from '../../components/import/ImportWizard';

export default function LeadSourcesPage() {
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  const googleLogo = (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.56-1.56 2.95-3.24 3.5v2.9h5.21c3.05-2.81 4.79-6.94 4.79-11.83 0-.6-.05-1.18-.1-1.7z"
        fill="#4285F4"
      />
      <path
        d="M12.18 20.43c2.75 0 5.06-.91 6.75-2.48l-5.21-2.9c-1.44.97-3.29 1.54-5.26 1.54-4.05 0-7.48-2.73-8.7-6.4H1.36v2.99c2.31 4.58 7.07 7.25 10.82 7.25z"
        fill="#34A853"
      />
      <path
        d="M3.48 10.19c-.31-.97-.48-2.01-.48-3.07s.17-2.1.48-3.07V1.06H1.36C.49 2.8.0 4.77.0 6.87s.49 4.07 1.36 5.81l2.12-2.49z"
        fill="#FBBC05"
      />
      <path
        d="M12.18 3.32c1.97 0 3.73.68 5.12 2.01l3.83-3.83C18.82.91 15.77.0 12.18.0 8.43.0 3.67 2.67 1.36 7.25l2.12 2.49c1.22-3.67 4.65-6.42 8.7-6.42z"
        fill="#EA4335"
      />
    </svg>
  );

  const whatsappLogo = (
    <svg className="w-6 h-6 text-emerald-500 fill-current" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.513 0 9.997-4.493 10.001-10.024.002-2.68-1.04-5.2-2.93-7.094C16.48 1.6 13.987.56 11.997.56c-5.503 0-9.988 4.493-9.992 10.024-.001 1.708.452 3.376 1.312 4.885l-.995 3.635 3.732-.98zm11.368-6.414c-.3-.15-1.772-.875-2.047-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.492-.893-.797-1.496-1.78-1.672-2.08-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525c-.075-.15-.675-1.625-.925-2.225-.244-.588-.492-.507-.675-.516-.174-.008-.374-.01-.574-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 3.25-1.05 3.375 0 .125.125.25.25.375.1.125 1.956 2.986 4.738 4.19.662.287 1.18.458 1.583.587.665.212 1.27.182 1.748.11.533-.08 1.772-.725 2.022-1.425.25-.7.25-1.3 0-1.425-.075-.125-.275-.2-.575-.35z" />
    </svg>
  );

  return (
    <div className="max-w-6xl w-full mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Lead Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect, manage, and control all your lead channels from one dashboard.
          </p>
        </div>

        {!importWizardOpen && (
          <button
            onClick={() => setImportWizardOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 text-sm self-start sm:self-center"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import via CSV</span>
          </button>
        )}
      </div>

      {/* Main Content Toggle */}
      {importWizardOpen ? (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <ImportWizard onClose={() => setImportWizardOpen(false)} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Lead Sources */}
          <div className="space-y-3">
            <h2 className="text-xs uppercase font-bold text-muted-foreground/80 tracking-wider">
              Active Lead Sources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <button
                onClick={() => setImportWizardOpen(true)}
                className="group relative flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-cta/40 hover:bg-cta/[0.02] rounded-2xl p-8 min-h-[140px] text-center transition-all duration-300 select-none"
              >
                <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center group-hover:scale-105 group-hover:border-cta/30 transition-all duration-300">
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-cta" />
                </div>
                <h3 className="font-bold text-sm text-foreground mt-3 tracking-tight">Add a new lead</h3>
                <p className="text-xs text-muted-foreground mt-1">Connect a lead source</p>
              </button>
            </div>
          </div>

          {/* All Sources */}
          <div className="space-y-3">
            <h2 className="text-xs uppercase font-bold text-muted-foreground/80 tracking-wider font-sans">
              All Sources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SourceCard
                name="Google Ads"
                logo={googleLogo}
                status="Not Connected • Inactive"
                statusType="inactive"
              />
              <SourceCard
                name="WhatsApp — Telephony"
                logo={whatsappLogo}
                status="Not Connected • Inactive"
                statusType="inactive"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
