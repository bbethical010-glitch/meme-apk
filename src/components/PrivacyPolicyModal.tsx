import React, { useState } from 'react';
import { X, ExternalLink, Mail, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree?: () => void;
  showAgreeButton?: boolean;
}

export default function PrivacyPolicyModal({
  isOpen,
  onClose,
  onAgree,
  showAgreeButton = false,
}: PrivacyPolicyModalProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm font-sans text-neutral-200">
      <div className="w-full max-w-[680px] h-[90vh] max-h-[850px] bg-[#18181b] border border-neutral-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        {/* Standard Generic Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#202024] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-normal leading-tight">
                Privacy Policy
              </h2>
              <p className="text-xs text-neutral-400">
                Meme Capsule Android App • Global Version 1.1
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Meta Info Strip */}
        <div className="px-5 py-2.5 bg-[#141416] border-b border-neutral-800 text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span>Effective Date: 25 September 2026</span>
          <span>Last Updated: 18 September 2026</span>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6 text-sm sm:text-[14.5px] leading-relaxed text-neutral-300">
          
          {/* Header Metadata Block */}
          <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-lg text-xs space-y-1.5 text-neutral-400">
            <p><strong className="text-neutral-200">App:</strong> Meme Capsule</p>
            <p><strong className="text-neutral-200">Operator:</strong> Meme Capsule</p>
            <p>
              <strong className="text-neutral-200">Privacy / Grievance Email:</strong>{' '}
              <a href="mailto:support@memecapsule.wtf" className="text-blue-400 hover:underline">
                support@memecapsule.wtf
              </a>
            </p>
          </div>

          {/* Quick Jump Links */}
          <div className="p-3 bg-neutral-900/50 border border-neutral-800/80 rounded-lg text-xs">
            <span className="font-medium text-neutral-300 block mb-2">Table of Contents:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-neutral-400">
              <button type="button" onClick={() => scrollToSection('sec-1')} className="text-left text-blue-400 hover:underline truncate">1. About This Policy</button>
              <button type="button" onClick={() => scrollToSection('sec-2')} className="text-left text-blue-400 hover:underline truncate">2. Info We Collect</button>
              <button type="button" onClick={() => scrollToSection('sec-3')} className="text-left text-blue-400 hover:underline truncate">3. How We Use Info</button>
              <button type="button" onClick={() => scrollToSection('sec-4')} className="text-left text-blue-400 hover:underline truncate">4. Infrastructure</button>
              <button type="button" onClick={() => scrollToSection('sec-5')} className="text-left text-blue-400 hover:underline truncate">5. AdMob Ads</button>
              <button type="button" onClick={() => scrollToSection('sec-6')} className="text-left text-blue-400 hover:underline truncate">6. Google Play & PRO</button>
              <button type="button" onClick={() => scrollToSection('sec-7')} className="text-left text-blue-400 hover:underline truncate">7. Permissions</button>
              <button type="button" onClick={() => scrollToSection('sec-8')} className="text-left text-blue-400 hover:underline truncate">8. Sharing & Transfers</button>
              <button type="button" onClick={() => scrollToSection('sec-9')} className="text-left text-blue-400 hover:underline truncate">9. Retention</button>
              <button type="button" onClick={() => scrollToSection('sec-10')} className="text-left text-blue-400 hover:underline truncate">10. Deletion Requests</button>
              <button type="button" onClick={() => scrollToSection('sec-11')} className="text-left text-blue-400 hover:underline truncate">11. Security</button>
              <button type="button" onClick={() => scrollToSection('sec-12')} className="text-left text-blue-400 hover:underline truncate">12. Children & 18+</button>
              <button type="button" onClick={() => scrollToSection('sec-13')} className="text-left text-blue-400 hover:underline truncate">13. Privacy Rights</button>
              <button type="button" onClick={() => scrollToSection('sec-14')} className="text-left text-blue-400 hover:underline truncate">14. Regional Frameworks</button>
              <button type="button" onClick={() => scrollToSection('sec-15')} className="text-left text-blue-400 hover:underline truncate">15. Legal Basis</button>
              <button type="button" onClick={() => scrollToSection('sec-16')} className="text-left text-blue-400 hover:underline truncate">16. Policy Changes</button>
              <button type="button" onClick={() => scrollToSection('sec-17')} className="text-left text-blue-400 hover:underline truncate">17. Contact Info</button>
            </div>
          </div>

          {/* Section 1 */}
          <section id="sec-1" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              1. About This Privacy Policy
            </h3>
            <p>
              This Privacy Policy explains how Meme Capsule ("Meme Capsule", "we", "us", or "our") collects, uses, stores, and shares information when you use the Meme Capsule Android application (the "App").
            </p>
            <p>
              Meme Capsule is a meme discovery and community application. The App allows users to view, vote on, react to, save, download, and share memes, participate in community activity, and report content.
            </p>
            <p>
              The App does not require you to create an account or provide your name, email address, telephone number, or similar identity information to use its core features.
            </p>
            <p>
              This Policy applies specifically to the Meme Capsule Android App. The separate Meme Capsule website is governed by its own privacy policy.
            </p>
            <p>
              The App is distributed worldwide. Privacy laws differ between jurisdictions, so additional rights or requirements may apply depending on where you live and the circumstances of the processing.
            </p>
          </section>

          {/* Section 2 */}
          <section id="sec-2" className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              2. Information We Collect and Do Not Collect
            </h3>
            
            <div className="space-y-1.5">
              <h4 className="font-medium text-neutral-200">2.1 Pseudonymous Device Identifier</h4>
              <p>
                Meme Capsule generates a pseudonymous identifier using technical and randomized data. The identifier is used only where a stated purpose requires associating certain server-side activity with the same App installation or device context over time.
              </p>
              <p>Depending on the relevant processing, this may include:</p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-300">
                <li>understanding content engagement and improving feed quality;</li>
                <li>supporting community activity and moderation;</li>
                <li>maintaining service security and reliability; and</li>
                <li>identifying patterns of activity relevant to preventing misuse or manipulation.</li>
              </ul>
              <p>
                The identifier is not required for the basic operation of the App. Core activities such as viewing memes and using features that operate locally on your device do not require you to provide an account or directly identifying information.
              </p>
              <p>
                Without the identifier, Meme Capsule may have less ability to associate separate server-side activities with the same App installation or device context, which may affect certain analytics, moderation, security, or operational functions.
              </p>
              <p>
                The identifier is pseudonymous rather than anonymous because it may be used to associate activity over time. It is not intended to be your name, email address, telephone number, IMEI, MAC address, Android hardware serial number, or Google Advertising ID.
              </p>
              <p>
                Meme Capsule may also use the identifier, where appropriate, to help locate relevant server-side records when processing a privacy or deletion request.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <h4 className="font-medium text-neutral-200">2.2 App Interaction and Analytics Data</h4>
              <p>
                Meme Capsule operates its own analytics and activity systems. Depending on how you use the App, we may collect information about your interactions with content and App features, such as viewing, skipping, reacting, voting, saving, downloading, sharing, and other engagement activity.
              </p>
              <p>
                This information may be associated with a pseudonymous identifier, session information, App version, content identifiers, timestamps, time spent viewing content, and related activity information.
              </p>
              <p>
                We use this information to understand content popularity and engagement, improve feed quality and functionality, operate the App, and identify misuse or technical issues.
              </p>
              <p>
                The information sent through our App activity systems does not intentionally include your name, email address, telephone number, GPS location, or IP address as part of ordinary App analytics.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <h4 className="font-medium text-neutral-200">2.3 Reports and Moderation</h4>
              <p>If you report a meme or other content, we may process information such as:</p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-300">
                <li>the relevant meme or content identifier;</li>
                <li>the reason for your report;</li>
                <li>any report text you submit;</li>
                <li>the time of the report; and</li>
                <li>the pseudonymous identifier associated with the submitting App installation or device context.</li>
              </ul>
              <p>
                Reports are reviewed through Meme Capsule's internal moderation processes. Information relating to resolved reports may be retained as moderation, safety, security, or operational information where appropriate.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <h4 className="font-medium text-neutral-200">2.4 Local App Data</h4>
              <p>
                Some features operate entirely on your device. These may include locally stored information such as saved memes, Vaults, Mood Boards, local history, and local preferences.
              </p>
              <p>
                This local information is not synchronised with the Meme Capsule backend. You can generally remove local App data by clearing the App's storage or uninstalling the App. This does not necessarily delete information that has already been processed on our servers.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <h4 className="font-medium text-neutral-200">2.5 Information We Do Not Intentionally Collect at the App Level</h4>
              <p>Meme Capsule does not require or intentionally collect the following for its core App functionality:</p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-300">
                <li>your name;</li>
                <li>email address;</li>
                <li>telephone number;</li>
                <li>account credentials;</li>
                <li>precise location;</li>
                <li>contacts;</li>
                <li>camera or microphone data; or</li>
                <li>GPS or cell-tower location data.</li>
              </ul>
              <p>
                Meme Capsule's application systems do not intentionally store client IP addresses as part of ordinary App analytics records. Our backend does not receive or store payment-card information, Google Play purchase tokens, or Google Play transaction IDs for the PRO purchase.
              </p>
              <p>
                This does not prevent third-party infrastructure or services from processing technical information as described in this Policy.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section id="sec-3" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              3. How We Use Information
            </h3>
            <p>We use information for purposes connected with operating, securing, and improving Meme Capsule, including to:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-300">
              <li>provide and maintain App functionality;</li>
              <li>deliver and organise meme content;</li>
              <li>process votes, reactions, saves, downloads, and shares;</li>
              <li>understand content popularity and user engagement;</li>
              <li>improve feed quality and App features;</li>
              <li>process and investigate content reports;</li>
              <li>prevent abuse, manipulation, fraud, and security incidents;</li>
              <li>maintain service reliability and backups;</li>
              <li>troubleshoot technical problems;</li>
              <li>comply with applicable law and lawful requests; and</li>
              <li>establish, exercise, or defend legal claims where applicable.</li>
            </ul>
            <p className="font-medium text-neutral-200">
              We do not sell personal data for monetary consideration.
            </p>
          </section>

          {/* Section 4 */}
          <section id="sec-4" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              4. Cloud Infrastructure and Other Service Providers
            </h3>
            <p>
              Meme Capsule uses third-party infrastructure and service providers to operate the App. These providers may process technical information on our behalf where necessary for network delivery, security, service operation, advertising, or payment-related functionality.
            </p>
            <p>
              Meme Capsule uses Cloudflare for certain infrastructure and service functions. Cloudflare and other service providers may process information in accordance with their applicable privacy practices, contractual obligations, and applicable law.
            </p>
            <p>
              The App also uses third-party services including Google AdMob and Google Play services. These services may process information in accordance with their own privacy policies and applicable law.
            </p>
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-md text-xs space-y-1.5">
              <span className="font-semibold text-neutral-200 block">Relevant Privacy Information:</span>
              <div>
                Cloudflare Privacy Policy:{' '}
                <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">
                  https://www.cloudflare.com/privacypolicy/ <ExternalLink size={12} />
                </a>
              </div>
              <div>
                Google Privacy Policy:{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">
                  https://policies.google.com/privacy <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section id="sec-5" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              5. Advertising — Google AdMob
            </h3>
            <p>Meme Capsule uses Google AdMob for advertising.</p>
            <p>
              The App may display interstitial advertisements and rewarded advertisements associated with certain in-app features.
            </p>
            <p>
              Meme Capsule uses non-personalised advertising. Google AdMob may process technical information for ad delivery and fraud prevention.
            </p>
            <p>
              Meme Capsule's first-party code does not directly access or store the Google Advertising ID and does not connect the Google Advertising ID with Meme Capsule's own pseudonymous identifier for first-party analytics.
            </p>
            <p>
              Users with the optional PRO upgrade do not receive advertisements through the App.
            </p>
            <p>
              Where applicable law requires consent or other privacy controls for advertising, Meme Capsule will use the mechanisms required for the relevant users and processing.
            </p>
          </section>

          {/* Section 6 */}
          <section id="sec-6" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              6. Google Play and PRO Purchases
            </h3>
            <p>
              Meme Capsule offers an optional one-time lifetime PRO purchase through Google Play Billing.
            </p>
            <p>
              Google Play handles the payment transaction. Meme Capsule's backend does not receive or store payment-card information, payment credentials, purchase tokens, transaction IDs, or payment transaction records.
            </p>
            <p>
              The App may process information necessary to determine whether the relevant PRO functionality is available on the device. Google Play's own terms and privacy practices apply to its services.
            </p>
          </section>

          {/* Section 7 */}
          <section id="sec-7" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              7. Permissions and Device Access
            </h3>
            <p>
              The App uses device permissions and Android system capabilities that are reasonably necessary for its functionality.
            </p>
            <p>Meme Capsule does not intentionally request access to:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-300">
              <li>precise location;</li>
              <li>contacts;</li>
              <li>camera;</li>
              <li>microphone; or</li>
              <li>other unrelated sensitive device information.</li>
            </ul>
            <p>
              The App may use network connectivity, Google Play services, advertising services, and other Android capabilities required for features described in this Privacy Policy. The permissions and system capabilities used by the App may vary depending on the Android version and the services available on the device.
            </p>
          </section>

          {/* Section 8 */}
          <section id="sec-8" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              8. Sharing and International Processing
            </h3>
            <p>
              We may provide information to third-party service providers where reasonably necessary to operate the App, including cloud infrastructure, advertising, and Google Play services.
            </p>
            <p>We may also disclose information where necessary to:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-300">
              <li>comply with applicable law;</li>
              <li>respond to valid legal requests;</li>
              <li>investigate security or abuse;</li>
              <li>protect users or Meme Capsule; or</li>
              <li>establish or defend legal claims.</li>
            </ul>
            <p>
              If Meme Capsule undergoes a merger, acquisition, restructuring, financing, sale of assets, or similar transaction, relevant information may be transferred as part of that transaction, subject to applicable law.
            </p>
            <p>
              Because Meme Capsule is distributed worldwide and uses services such as Cloudflare and Google, information may be processed or stored in countries other than the country where you live. Where applicable law imposes requirements on international transfers, we will handle those transfers in accordance with the requirements applicable to the relevant processing.
            </p>
          </section>

          {/* Section 9 */}
          <section id="sec-9" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              9. Data Retention
            </h3>
            <p>
              We retain information only for as long as reasonably necessary for the purposes described in this Policy, for security and operational purposes, or as required or permitted by applicable law.
            </p>
            <p>
              Different categories of information may be retained for different periods depending on their purpose, operational requirements, and applicable legal obligations.
            </p>
          </section>

          {/* Section 10 */}
          <section id="sec-10" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              10. Deletion and Privacy Requests
            </h3>
            <p>
              Because the App does not require user accounts, there is no account-deletion process for a Meme Capsule account.
            </p>
            <p>
              You may request deletion of applicable server-side personal information associated with your pseudonymous identifier by contacting:{' '}
              <a href="mailto:support@memecapsule.wtf" className="text-blue-400 hover:underline">
                support@memecapsule.wtf
              </a>
            </p>
            <p>
              We may request reasonable information necessary to identify the relevant data and protect against unauthorised deletion requests. Where applicable law requires deletion, we will delete the relevant information subject to lawful exceptions and retention requirements, including where information must be retained for legal, security, fraud-prevention, dispute-resolution, or claims-related purposes.
            </p>
            <p>
              Local App data can generally be removed by clearing the App's storage or uninstalling the App.
            </p>
          </section>

          {/* Section 11 */}
          <section id="sec-11" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              11. Security
            </h3>
            <p>
              Meme Capsule uses reasonable technical and organisational measures designed to protect information against unauthorised access, loss, misuse, alteration, or disclosure.
            </p>
            <p>
              These measures may include encrypted communications, access controls, administrative safeguards, validation and abuse-prevention measures, protected infrastructure, and backup and recovery measures.
            </p>
            <p>
              We do not disclose detailed internal security architecture, authentication mechanisms, database configurations, access credentials, or other security-sensitive implementation details in this public Privacy Policy.
            </p>
            <p>
              No electronic storage or transmission method can be guaranteed to be completely secure. If we become aware of a security incident involving personal information, we will assess and respond to it in accordance with applicable law, including any required notifications to affected individuals or authorities.
            </p>
          </section>

          {/* Section 12 */}
          <section id="sec-12" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              12. Children and 18+ Use
            </h3>
            <div className="p-3 bg-neutral-900 border border-amber-900/40 rounded-md text-amber-200/90">
              <strong className="text-amber-100 block mb-1">Age Requirement: 18+</strong>
              Meme Capsule is intended for users aged 18 and above and is not intended for minors. The App presents an 18+ acknowledgement during initial use. There is currently no separate age-verification system or parental-consent mechanism.
            </div>
            <p>
              If you are under 18, you should not use the App.
            </p>
            <p>
              Meme Capsule does not intentionally design the App to collect personal information from children. If we become aware of processing involving a child that requires a different approach under applicable law, we will take appropriate steps required by that law.
            </p>
          </section>

          {/* Section 13 */}
          <section id="sec-13" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              13. Privacy Rights and Grievances
            </h3>
            <p>
              Depending on your location and the privacy laws applicable to you, you may have rights relating to your personal information, including rights to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-300">
              <li>access;</li>
              <li>correction;</li>
              <li>deletion;</li>
              <li>restriction;</li>
              <li>objection;</li>
              <li>portability;</li>
              <li>withdrawal of consent where applicable; and</li>
              <li>complaint to a competent privacy or supervisory authority.</li>
            </ul>
            <p>The availability and scope of these rights vary by jurisdiction.</p>
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-md text-xs space-y-1 text-neutral-400">
              <p className="font-semibold text-neutral-200">Grievance Contact:</p>
              <p>Designation: Grievance Officer</p>
              <p>
                Email:{' '}
                <a href="mailto:support@memecapsule.wtf" className="text-blue-400 hover:underline">
                  support@memecapsule.wtf
                </a>
              </p>
            </div>
            <p>
              Where a grievance is subject to a statutory grievance-redressal period, Meme Capsule will address it within the period required by applicable law. We may request reasonable information to verify and process a privacy request.
            </p>
          </section>

          {/* Section 14 */}
          <section id="sec-14" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              14. Regional Privacy Frameworks
            </h3>
            
            <div className="space-y-1.5">
              <h4 className="font-medium text-neutral-200">European Economic Area, Switzerland, and United Kingdom</h4>
              <p>
                Where applicable data-protection law applies to Meme Capsule's processing, users in these jurisdictions may have additional rights concerning access, correction, deletion, restriction, objection, portability, and withdrawal of consent where applicable. Where the law requires a particular legal basis or additional information, Meme Capsule will apply the requirements applicable to the relevant processing. You may also have the right to complain to the relevant data-protection or supervisory authority.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <h4 className="font-medium text-neutral-200">United States and California</h4>
              <p>
                Privacy requirements vary between US states. Where applicable state privacy laws apply to Meme Capsule and your personal information, you may have additional rights concerning access, correction, deletion, or certain uses or disclosures of personal information. For California residents, rights may apply under California privacy law where the applicable statutory requirements and thresholds are met. Meme Capsule does not represent that every US state privacy law applies to every user or every processing activity.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <h4 className="font-medium text-neutral-200">India</h4>
              <p>
                Meme Capsule is operated from India and may be subject to applicable Indian privacy, information-technology, consumer, and other laws, including applicable provisions of the Information Technology Act, 2000, the rules made under it, the Digital Personal Data Protection Act, 2023, and related rules and regulations as and when applicable to the relevant processing. This Policy is not limited to Indian law. Users in other jurisdictions may have additional rights under the laws applicable to them.
              </p>
            </div>
          </section>

          {/* Section 15 */}
          <section id="sec-15" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              15. Legal Basis and Consent
            </h3>
            <p>
              Meme Capsule processes information in accordance with applicable privacy and data-protection laws.
            </p>
            <p>
              Where applicable law requires consent for a particular processing activity, Meme Capsule will obtain consent in the manner required by that law. Where applicable law permits another lawful basis for processing, Meme Capsule may rely on that basis.
            </p>
            <p>
              Where required by applicable law, you may have the right to withdraw consent, subject to the consequences and limitations permitted by law.
            </p>
          </section>

          {/* Section 16 */}
          <section id="sec-16" className="space-y-2 pt-2">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              16. Changes to This Privacy Policy
            </h3>
            <p>
              We may update this Privacy Policy when the App, our data practices, third-party services, applicable law, or Google Play requirements change.
            </p>
            <p>
              The Last Updated date at the beginning of this Policy will identify the current version. Where applicable law requires additional notice or consent for a material change, we will provide the notice or obtain the consent required by law.
            </p>
          </section>

          {/* Section 17 */}
          <section id="sec-17" className="space-y-2 pt-2 pb-4">
            <h3 className="text-base font-semibold text-white border-b border-neutral-800 pb-1">
              17. Contact Information
            </h3>
            <p>For privacy questions, deletion requests, or grievances:</p>
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-md text-xs space-y-1 text-neutral-300">
              <p className="font-semibold text-white">Meme Capsule</p>
              <p>
                Privacy / Grievance Email:{' '}
                <a href="mailto:support@memecapsule.wtf" className="text-blue-400 hover:underline">
                  support@memecapsule.wtf
                </a>
              </p>
              <p>Designation: Grievance Officer</p>
            </div>
          </section>

        </div>

        {/* Generic Footer */}
        <div className="px-5 py-3.5 bg-[#202024] border-t border-neutral-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          {showAgreeButton && onAgree && (
            <button
              type="button"
              onClick={() => {
                onAgree();
                onClose();
              }}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              I Agree & Understand
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
