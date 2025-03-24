export interface Rep {
  id: string;
  Deal_Name: string;
  Stage: string;
  Contact_Name: {
    name: string;
    id: string;
  };
  Modified_Time: string;
  Owner: {
    name: string;
    id: string;
    email: string;
  };
  Phone: string | null;
  Pipeline: string;
  Created_Time: string;
  Description: string | null;
  Last_Activity_Time: string;
}

// ... rest of the types ... 