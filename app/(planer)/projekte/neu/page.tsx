import { NeuProjektWizard } from './wizard'

export default function NeuProjektPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Neues Projekt anlegen</h1>
      <NeuProjektWizard />
    </div>
  )
}
