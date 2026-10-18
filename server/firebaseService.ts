import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = sanitizeForFirestore(v);
      }
    }
    return res;
  }
  return obj;
}

export class FirebaseService {
  private firestore: Firestore | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        console.warn('⚠️ Firebase config missing projectId or apiKey');
        return;
      }

      const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
      this.firestore = firebaseConfig.firestoreDatabaseId
        ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : getFirestore(app);
      this.isConfigured = true;
      console.log(`🔥 Firebase Firestore conectado com sucesso (DB: ${firebaseConfig.firestoreDatabaseId || 'default'})`);
    } catch (err: any) {
      console.warn('⚠️ Erro ao inicializar Firestore:', err?.message);
    }
  }

  public isReady(): boolean {
    return this.isConfigured && this.firestore !== null;
  }

  public getDb(): Firestore | null {
    return this.firestore;
  }

  // Generic document upsert
  public async upsert(collectionName: string, id: string, data: any): Promise<void> {
    if (!this.firestore || !id) return;
    try {
      const sanitized = sanitizeForFirestore(data);
      const docRef = doc(this.firestore, collectionName, String(id));
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore] Erro ao salvar em ${collectionName}/${id}:`, err?.message);
    }
  }

  // Generic document delete
  public async delete(collectionName: string, id: string): Promise<void> {
    if (!this.firestore || !id) return;
    try {
      const docRef = doc(this.firestore, collectionName, String(id));
      await deleteDoc(docRef);
    } catch (err: any) {
      console.warn(`[Firestore] Erro ao excluir de ${collectionName}/${id}:`, err?.message);
    }
  }

  // Generic fetch all documents from a collection
  public async getAll(collectionName: string): Promise<any[]> {
    if (!this.firestore) return [];
    try {
      const colRef = collection(this.firestore, collectionName);
      const snapshot = await getDocs(colRef);
      const list: any[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (err: any) {
      console.warn(`[Firestore] Erro ao listar coleção ${collectionName}:`, err?.message);
      return [];
    }
  }

  // Entity-specific helpers
  public async upsertCustomer(customer: any) {
    if (!customer?.id) return;
    return this.upsert('customers', customer.id, customer);
  }

  public async deleteCustomer(id: string) {
    return this.delete('customers', id);
  }

  public async upsertCharge(charge: any) {
    if (!charge?.id) return;
    return this.upsert('charges', charge.id, charge);
  }

  public async deleteCharge(id: string) {
    return this.delete('charges', id);
  }

  public async upsertPlan(plan: any) {
    if (!plan?.id) return;
    return this.upsert('plans', plan.id, plan);
  }

  public async deletePlan(id: string) {
    return this.delete('plans', id);
  }

  public async upsertApplication(app: any) {
    if (!app?.id) return;
    return this.upsert('applications', app.id, app);
  }

  public async deleteApplication(id: string) {
    return this.delete('applications', id);
  }

  public async upsertTenant(tenant: any) {
    if (!tenant?.id) return;
    return this.upsert('tenants', tenant.id, tenant);
  }

  public async upsertProfile(profile: any) {
    if (!profile?.id) return;
    return this.upsert('profiles', String(profile.id), profile);
  }

  public async upsertWhatsAppInstance(instance: any) {
    if (!instance?.id) return;
    return this.upsert('whatsapp_instances', instance.id, instance);
  }

  public async upsertWhatsAppSettings(settings: any) {
    if (!settings?.id) return;
    return this.upsert('automation_settings', settings.id, settings);
  }

  public async upsertMessageLog(log: any) {
    if (!log?.id) return;
    return this.upsert('message_logs', log.id, log);
  }

  public async upsertLicense(license: any) {
    if (!license?.id) return;
    return this.upsert('licenses', license.id, license);
  }

  public async upsertTransaction(tx: any) {
    if (!tx?.id) return;
    return this.upsert('payment_transactions', tx.id, tx);
  }
}

export const firebaseService = new FirebaseService();
