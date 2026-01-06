import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  studentId?: string;
  parentEmail?: string;
  studentName: string;
  courseName: string;
  courseCode: string;
  attendancePercent: number;
  threshold?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      studentId, 
      parentEmail, 
      studentName, 
      courseName, 
      courseCode,
      attendancePercent, 
      threshold = 80 
    }: AlertRequest = await req.json();

    console.log(`Processing attendance alert for ${studentName} in ${courseName}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured. Logging alert:");
      console.log({ parentEmail, studentName, courseName, courseCode, attendancePercent, threshold });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Alert logged (email not configured)",
          data: { studentName, courseName, attendancePercent }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If studentId provided, fetch parent emails from database
    let recipientEmails: string[] = [];
    
    if (studentId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: parentLinks } = await supabase
        .from("parent_student_links")
        .select("parent_id")
        .eq("student_id", studentId);

      if (parentLinks && parentLinks.length > 0) {
        const parentIds = parentLinks.map(l => l.parent_id);
        const { data: parentProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", parentIds);
        
        if (parentProfiles) {
          recipientEmails = parentProfiles.map(p => p.email);
        }
      }
    }

    if (parentEmail && !recipientEmails.includes(parentEmail)) {
      recipientEmails.push(parentEmail);
    }

    if (recipientEmails.length === 0) {
      console.log("No parent emails found for notification");
      return new Response(
        JSON.stringify({ success: true, message: "No parents to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending alerts to: ${recipientEmails.join(", ")}`);

    const emailPromises = recipientEmails.map(email => 
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SmartAttend <onboarding@resend.dev>",
          to: [email],
          subject: `⚠️ Attendance Alert: ${studentName} - ${courseCode}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .header p { margin: 10px 0 0; opacity: 0.9; }
                .content { background: #ffffff; padding: 40px 30px; }
                .alert-card { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 25px 0; }
                .percentage { font-size: 56px; font-weight: 800; color: #dc2626; text-align: center; margin: 0; }
                .threshold-text { color: #6b7280; text-align: center; margin-top: 5px; font-size: 14px; }
                .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
                .info-label { color: #6b7280; }
                .info-value { font-weight: 600; color: #111827; }
                .warning-list { background: #fef2f2; border-radius: 8px; padding: 20px; margin: 25px 0; }
                .warning-list h3 { color: #dc2626; margin: 0 0 15px; font-size: 16px; }
                .warning-list ul { margin: 0; padding-left: 20px; }
                .warning-list li { margin: 8px 0; color: #7f1d1d; }
                .cta { text-align: center; margin: 30px 0; }
                .cta-button { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 35px; border-radius: 30px; text-decoration: none; display: inline-block; font-weight: 600; }
                .footer { background: #f9fafb; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📚 SmartAttend</h1>
                  <p>Low Attendance Alert for Parent</p>
                </div>
                <div class="content">
                  <p>Dear Parent/Guardian,</p>
                  <p>This is an automated notification regarding your child's attendance record.</p>
                  
                  <div class="alert-card">
                    <p class="percentage">${attendancePercent.toFixed(1)}%</p>
                    <p class="threshold-text">Required minimum: ${threshold}%</p>
                  </div>
                  
                  <div style="margin: 25px 0;">
                    <div class="info-row">
                      <span class="info-label">Student Name</span>
                      <span class="info-value">${studentName}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Course</span>
                      <span class="info-value">${courseName}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Course Code</span>
                      <span class="info-value">${courseCode}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Current Attendance</span>
                      <span class="info-value" style="color: #dc2626;">${attendancePercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div class="warning-list">
                    <h3>⚠️ Potential Consequences</h3>
                    <ul>
                      <li>May not be eligible to sit for examinations</li>
                      <li>Academic standing could be affected</li>
                      <li>Course credit may not be awarded</li>
                    </ul>
                  </div>

                  <p><strong>Recommended Actions:</strong></p>
                  <ol>
                    <li>Discuss attendance with your child</li>
                    <li>Contact the course instructor for clarification</li>
                    <li>Review any pending leave applications</li>
                    <li>Ensure regular class attendance going forward</li>
                  </ol>

                  <div class="cta">
                    <a href="#" class="cta-button">View Detailed Report</a>
                  </div>
                </div>
                <div class="footer">
                  <p>This is an automated message from SmartAttend. Please do not reply.</p>
                  <p>© ${new Date().getFullYear()} SmartAttend - Smart Attendance & Lecture Companion</p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      })
    );

    const results = await Promise.all(emailPromises);
    const responses = await Promise.all(results.map(r => r.json()));
    
    console.log("Emails sent successfully:", responses);

    return new Response(
      JSON.stringify({ success: true, emailsSent: recipientEmails.length, data: responses }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-attendance-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
