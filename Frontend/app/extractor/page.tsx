"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Upload, X, Plus, FileImage, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AuthGuard } from "@/components/auth-guard"

interface Medicine {
  id: string
  name: string
  dosage: string
  frequency: string
  duration: string
}

export default function PrescriptionExtractor() {
  const [file, setFile] = useState<File | null>(null)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && ["image/jpeg", "image/jpg", "image/png"].includes(droppedFile.type)) {
        setFile(droppedFile)
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, JPEG, or PNG image.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const extractMedicines = async () => {
    if (!file) return

    setIsExtracting(true)
    const formData = new FormData()
    formData.append("image", file)

    try {
      const response = await fetch("http://localhost:5001/api/extract", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to extract medicines")
      }

      const data = await response.json()
      const extractedMedicines: Medicine[] =
        data.medicines?.map((med: any, index: number) => ({
          id: `med-${index}`,
          name: med.name || "",
          dosage: med.dosage || "",
          frequency: med.frequency || "",
          duration: med.duration || "",
        })) || []

      setMedicines(extractedMedicines)

      if (extractedMedicines.length === 0) {
        toast({
          title: "No medicines detected",
          description: "Please try another prescription.",
        })
      }
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: "Failed to extract medicines from the prescription.",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  const updateMedicine = (id: string, field: keyof Medicine, value: string) => {
    setMedicines((prev) => prev.map((med) => (med.id === id ? { ...med, [field]: value } : med)))
  }

  const addMedicine = () => {
    const newMedicine: Medicine = {
      id: `med-${Date.now()}`,
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
    }
    setMedicines((prev) => [...prev, newMedicine])
  }

  const deleteMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((med) => med.id !== id))
  }

  const saveChanges = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("http://localhost:5001/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ medicines }),
      })

      if (!response.ok) {
        throw new Error("Failed to save changes")
      }

      toast({
        title: "Changes saved",
        description: "Medicine list has been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetApp = () => {
    setFile(null)
    setMedicines([])
    setIsExtracting(false)
    setIsSaving(false)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="mb-4 text-muted-foreground hover:text-card-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl font-bold text-card-foreground">
                Prescription Medicine Extractor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!file && (
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-card-foreground">Drop your prescription image here</p>
                    <p className="text-sm text-muted-foreground">or click to browse (JPG, JPEG, PNG)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}

              {file && !medicines.length && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileImage className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium text-card-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={extractMedicines} disabled={isExtracting} className="w-full">
                    {isExtracting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting medicines...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Extract Medicines
                      </>
                    )}
                  </Button>
                </div>
              )}

              {medicines.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-card-foreground">Extracted Medicines</h3>
                    <Button onClick={addMedicine} variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Medicine
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Dosage</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {medicines.map((medicine) => (
                          <TableRow key={medicine.id}>
                            <TableCell>
                              <Input
                                value={medicine.name}
                                onChange={(e) => updateMedicine(medicine.id, "name", e.target.value)}
                                placeholder="Medicine name"
                                className="border-0 p-0 h-auto focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={medicine.dosage}
                                onChange={(e) => updateMedicine(medicine.id, "dosage", e.target.value)}
                                placeholder="Dosage"
                                className="border-0 p-0 h-auto focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={medicine.frequency}
                                onChange={(e) => updateMedicine(medicine.id, "frequency", e.target.value)}
                                placeholder="Frequency"
                                className="border-0 p-0 h-auto focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={medicine.duration}
                                onChange={(e) => updateMedicine(medicine.id, "duration", e.target.value)}
                                placeholder="Duration"
                                className="border-0 p-0 h-auto focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMedicine(medicine.id)}
                                className="text-destructive hover:text-destructive"
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
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button onClick={resetApp} variant="outline" className="flex-1 sm:flex-none bg-transparent">
                      Upload Another Prescription
                    </Button>
                  </div>
                </div>
              )}

              {medicines.length === 0 && file && !isExtracting && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No medicines detected. Please try another prescription.</p>
                  <Button onClick={resetApp} variant="outline" className="mt-4 bg-transparent">
                    Upload Another Prescription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
