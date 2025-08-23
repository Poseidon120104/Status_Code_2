"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, X, ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AuthGuard } from "@/components/auth-guard"

interface Medicine {
  id: string
  name: string
  time: string[]
  start_date: string
  end_date: string
  notes: string
}

function makeId() {
  return `med-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export default function ManualPrescriptionPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      id: makeId(),
      name: "",
      time: [""],
      start_date: "",
      end_date: "",
      notes: "",
    },
  ])
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // If there are extracted medicines, set as initial state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("extractedMedicines");
      console.log("Loaded from localStorage", data);
      if (data) {
        try {
          let meds = JSON.parse(data)
          // Normalize: Array & correct shape & add unique id if missing
          if (!Array.isArray(meds)) meds = [meds]
          meds = meds.map((med: any) => ({
            id: makeId(),
            name: med.name || "",
            time: Array.isArray(med.time) ? med.time : [med.time ?? ""],
            start_date: med.start_date || "",
            end_date: med.end_date || "",
            notes: med.notes || "",
          }))
          setMedicines(meds)
        } catch { /* fallback to default blank */ }
        localStorage.removeItem("extractedMedicines") // ensure not reused again
      }
    }
  }, [])

  const updateMedicine = (id: string, field: keyof Medicine, value: string | string[]) => {
    setMedicines((prev) =>
      prev.map((med) =>
        med.id === id ? { ...med, [field]: value } : med
      )
    )
  }

  const updateTime = (id: string, idx: number, value: string) => {
    setMedicines((prev) =>
      prev.map((med) =>
        med.id === id
          ? { ...med, time: med.time.map((t, i) => (i === idx ? value : t)) }
          : med
      )
    )
  }

  const addMedicine = () => {
    const newMedicine: Medicine = {
      id: makeId(),
      name: "",
      time: [""],
      start_date: "",
      end_date: "",
      notes: "",
    }
    setMedicines((prev) => [...prev, newMedicine])
  }

  const deleteMedicine = (id: string) => {
    if (medicines.length > 1) {
      setMedicines((prev) => prev.filter((med) => med.id !== id))
    }
  }

  const saveChanges = async () => {
    // Simple filter out entirely empty
    const validMedicines = medicines.filter(
      (med) =>
        med.name.trim() ||
        med.time.some((t) => t.trim()) ||
        med.start_date.trim() ||
        med.end_date.trim() ||
        med.notes.trim()
    )

    if (validMedicines.length === 0) {
      toast({
        title: "No medicines to save",
        description: "Please add at least one medicine with details.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("http://localhost:5001/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ medicines: validMedicines }),
      })
      if (!response.ok) throw new Error("Failed to save changes")
      toast({
        title: "Changes saved",
        description: "Medicine list has been saved successfully.",
      })
    } catch {
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const clearAll = () => {
    setMedicines([
      {
        id: makeId(),
        name: "",
        time: [""],
        start_date: "",
        end_date: "",
        notes: "",
      },
    ])
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="mb-4 text-muted-foreground hover:text-card-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl font-bold text-card-foreground">
                Manual Prescription Entry
              </CardTitle>
              <p className="text-muted-foreground">
                Add prescription medicines manually
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Medicine List
                </h3>
                <Button onClick={addMedicine} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Medicine
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Times</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicines.map((medicine) => (
                      <TableRow key={medicine.id}>
                        {/* Name */}
                        <TableCell>
                          <Input
                            value={medicine.name}
                            onChange={(e) => updateMedicine(medicine.id, "name", e.target.value)}
                            placeholder="e.g., Amoxicillin"
                            className="w-full"
                          />
                        </TableCell>
                        {/* Times */}
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {medicine.time.map((t, idx) => (
                              <Input
                                key={idx}
                                type="time"
                                value={t}
                                onChange={(e) => updateTime(medicine.id, idx, e.target.value)}
                                className="w-full"
                              />
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateMedicine(medicine.id, "time", [...medicine.time, ""])
                              }
                            >
                              Add Time
                            </Button>
                          </div>
                        </TableCell>
                        {/* Start Date */}
                        <TableCell>
                          <Input
                            type="date"
                            value={medicine.start_date}
                            onChange={(e) => updateMedicine(medicine.id, "start_date", e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        {/* End Date */}
                        <TableCell>
                          <Input
                            type="date"
                            value={medicine.end_date}
                            onChange={(e) => updateMedicine(medicine.id, "end_date", e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        {/* Notes */}
                        <TableCell>
                          <Input
                            value={medicine.notes}
                            onChange={(e) => updateMedicine(medicine.id, "notes", e.target.value)}
                            placeholder="e.g., after meals"
                            className="w-full"
                          />
                        </TableCell>
                        {/* Delete */}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMedicine(medicine.id)}
                            disabled={medicines.length === 1}
                            className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={saveChanges} disabled={isSaving} className="flex-1">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Prescription
                    </>
                  )}
                </Button>
                <Button
                  onClick={clearAll}
                  variant="outline"
                  className="flex-1 sm:flex-none bg-transparent"
                >
                  Clear All
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-card-foreground mb-2">
                  Tips for Manual Entry:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Enter medicine name clearly (generic or brand name)</li>
                  <li>• Add one or more times per day (e.g., 08:00, 20:00)</li>
                  <li>• Select the treatment start and end dates</li>
                  <li>• Add any usage notes (e.g., "after meals")</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
